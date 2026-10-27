import os
import base64
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings

class GitHubService:
    def __init__(self, token: Optional[str] = None):
        self._token = token
        self.api_base = settings.GITHUB_API_BASE
        
    @property
    def token(self) -> Optional[str]:
        """Dynamically resolves token from explicit instance, environment, settings, or database."""
        if self._token and self._token.strip():
            return self._token.strip()
            
        env_token = os.getenv("GITHUB_TOKEN") or settings.GITHUB_TOKEN
        if env_token and env_token.strip():
            return env_token.strip()
            
        try:
            from app.db.session import SyncSessionLocal
            from app.db.models import GitHubConnection
            with SyncSessionLocal() as session:
                conn = session.query(GitHubConnection).filter(GitHubConnection.is_active == True).first()
                if conn and conn.encrypted_token and conn.encrypted_token.strip():
                    return conn.encrypted_token.strip()
        except Exception:
            pass
            
        return None

    @token.setter
    def token(self, value: Optional[str]):
        self._token = value

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "Issue-to-PR-Agent/1.0"
        }
        current_token = self.token
        if current_token:
            headers["Authorization"] = f"Bearer {current_token}"
        return headers

    async def get_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """Fetches repository metadata from GitHub API."""
        url = f"{self.api_base}/repos/{owner}/{repo}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code == 404:
                raise ValueError(f"Repository {owner}/{repo} not found on GitHub or is private without token access.")
            elif resp.status_code == 401:
                raise PermissionError("Invalid or expired GitHub credentials. Please verify your GITHUB_TOKEN.")
            elif resp.status_code == 403:
                raise PermissionError("GitHub API rate limit exceeded or access forbidden for this repository.")
            resp.raise_for_status()
            return resp.json()

    async def get_issue(self, owner: str, repo: str, issue_number: int) -> Dict[str, Any]:
        """Fetches issue details including title, body, labels, state."""
        url = f"{self.api_base}/repos/{owner}/{repo}/issues/{issue_number}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code == 404:
                raise ValueError(f"Issue #{issue_number} in {owner}/{repo} was not found on GitHub.")
            elif resp.status_code == 401:
                raise PermissionError("Invalid GitHub credentials when fetching issue.")
            elif resp.status_code == 403:
                raise PermissionError("GitHub API rate limit exceeded or access forbidden.")
            resp.raise_for_status()
            return resp.json()

    async def get_repository_tree(self, owner: str, repo: str, ref: str = "main") -> List[Dict[str, Any]]:
        """Fetches the file tree for a repository at a given ref/branch."""
        url = f"{self.api_base}/repos/{owner}/{repo}/git/trees/{ref}?recursive=1"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code != 200:
                return []
            data = resp.json()
            return data.get("tree", [])

    async def get_file_content(self, owner: str, repo: str, path: str, ref: str = "main") -> Optional[str]:
        """Fetches raw content of a file in the repository."""
        url = f"{self.api_base}/repos/{owner}/{repo}/contents/{path}?ref={ref}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code != 200:
                return None
            data = resp.json()
            content_b64 = data.get("content", "")
            try:
                return base64.b64decode(content_b64).decode("utf-8")
            except Exception:
                return None

    async def create_branch(self, owner: str, repo: str, branch_name: str, base_branch: str = "main") -> Dict[str, Any]:
        """Creates a git branch starting from base_branch commit SHA."""
        if not self.token:
            raise PermissionError("A valid GitHub token with 'repo' scope is required to create branches.")
        
        headers = self._get_headers()
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Get base branch commit SHA
            ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/ref/heads/{base_branch}"
            resp = await client.get(ref_url, headers=headers)
            
            if resp.status_code == 404:
                # Try fetching repository to determine actual default branch
                repo_info = await self.get_repository(owner, repo)
                actual_default = repo_info.get("default_branch", "main")
                if actual_default != base_branch:
                    ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/ref/heads/{actual_default}"
                    resp = await client.get(ref_url, headers=headers)
            
            if resp.status_code != 200:
                raise ValueError(f"Base branch '{base_branch}' not found in {owner}/{repo}: {resp.text}")
                
            sha = resp.json()["object"]["sha"]
            
            # 2. Check if branch already exists
            check_url = f"{self.api_base}/repos/{owner}/{repo}/git/ref/heads/{branch_name}"
            check_resp = await client.get(check_url, headers=headers)
            if check_resp.status_code == 200:
                return {"branch": branch_name, "status": "already_exists", "sha": check_resp.json()["object"]["sha"]}
                
            # 3. Create new git ref
            create_ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/refs"
            payload = {
                "ref": f"refs/heads/{branch_name}",
                "sha": sha
            }
            create_resp = await client.post(create_ref_url, headers=headers, json=payload)
            if create_resp.status_code == 422:
                # Branch might have been created concurrently
                return {"branch": branch_name, "status": "already_exists", "sha": sha}
            create_resp.raise_for_status()
            return create_resp.json()

    async def commit_files(
        self,
        owner: str,
        repo: str,
        branch_name: str,
        files: List[Dict[str, str]],
        commit_message: str
    ) -> Dict[str, Any]:
        """
        Commits multiple files to a git branch using the GitHub Git Data API.
        files: list of dicts with 'path' and 'content' keys.
        """
        if not self.token:
            raise PermissionError("A valid GitHub token with 'repo' scope is required to commit files.")
            
        if not files:
            raise ValueError("No files provided to commit.")

        headers = self._get_headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Get HEAD commit of the branch
            ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/ref/heads/{branch_name}"
            ref_resp = await client.get(ref_url, headers=headers)
            if ref_resp.status_code != 200:
                raise ValueError(f"Branch '{branch_name}' not found in {owner}/{repo}: {ref_resp.text}")
            head_commit_sha = ref_resp.json()["object"]["sha"]

            # 2. Get tree SHA of HEAD commit
            commit_url = f"{self.api_base}/repos/{owner}/{repo}/git/commits/{head_commit_sha}"
            commit_resp = await client.get(commit_url, headers=headers)
            commit_resp.raise_for_status()
            base_tree_sha = commit_resp.json()["tree"]["sha"]

            # 3. Create blobs for each modified file
            tree_items = []
            for item in files:
                path = item.get("path") or item.get("file_path")
                content = item.get("content") or item.get("new_content", "")
                if not path:
                    continue
                
                blob_url = f"{self.api_base}/repos/{owner}/{repo}/git/blobs"
                blob_resp = await client.post(
                    blob_url,
                    headers=headers,
                    json={"content": content, "encoding": "utf-8"}
                )
                blob_resp.raise_for_status()
                blob_sha = blob_resp.json()["sha"]
                
                tree_items.append({
                    "path": path,
                    "mode": "100644",
                    "type": "blob",
                    "sha": blob_sha
                })

            if not tree_items:
                raise ValueError("No valid file blobs could be created for commit.")

            # 4. Create new tree based on base_tree
            tree_url = f"{self.api_base}/repos/{owner}/{repo}/git/trees"
            tree_resp = await client.post(
                tree_url,
                headers=headers,
                json={"base_tree": base_tree_sha, "tree": tree_items}
            )
            tree_resp.raise_for_status()
            new_tree_sha = tree_resp.json()["sha"]

            # 5. Create new commit
            create_commit_url = f"{self.api_base}/repos/{owner}/{repo}/git/commits"
            new_commit_resp = await client.post(
                create_commit_url,
                headers=headers,
                json={
                    "message": commit_message,
                    "tree": new_tree_sha,
                    "parents": [head_commit_sha]
                }
            )
            new_commit_resp.raise_for_status()
            new_commit_sha = new_commit_resp.json()["sha"]

            # 6. Update branch ref to point to new commit
            update_ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/refs/heads/{branch_name}"
            update_ref_resp = await client.patch(
                update_ref_url,
                headers=headers,
                json={"sha": new_commit_sha, "force": False}
            )
            update_ref_resp.raise_for_status()

            return {
                "commit_sha": new_commit_sha,
                "tree_sha": new_tree_sha,
                "branch": branch_name
            }

    async def create_pull_request(
        self,
        owner: str,
        repo: str,
        title: str,
        body: str,
        head_branch: str,
        base_branch: str = "main"
    ) -> Dict[str, Any]:
        """Creates a Pull Request on GitHub."""
        if not self.token:
            raise PermissionError("A valid GitHub token is required to create a Pull Request on GitHub.")
            
        headers = self._get_headers()
        url = f"{self.api_base}/repos/{owner}/{repo}/pulls"
        payload = {
            "title": title,
            "body": body,
            "head": head_branch,
            "base": base_branch,
            "draft": False
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 422:
                # Check if PR already exists for this branch
                list_url = f"{self.api_base}/repos/{owner}/{repo}/pulls?head={owner}:{head_branch}&state=open"
                list_resp = await client.get(list_url, headers=headers)
                if list_resp.status_code == 200:
                    matching = list_resp.json()
                    if matching and len(matching) > 0:
                        return matching[0]
                error_detail = resp.json().get("errors", [{}])[0].get("message", resp.text)
                raise ValueError(f"GitHub PR creation failed: {error_detail}")
            elif resp.status_code == 401:
                raise PermissionError("GitHub credentials invalid or expired.")
            elif resp.status_code == 403:
                raise PermissionError("Forbidden: token lacks 'repo' scope or repository permissions are insufficient.")
            elif resp.status_code == 404:
                raise ValueError(f"Repository {owner}/{repo} not found on GitHub.")
            resp.raise_for_status()
            return resp.json()

    async def get_rate_limit(self) -> Dict[str, Any]:
        """Fetches current GitHub API rate limit status."""
        url = f"{self.api_base}/rate_limit"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code == 200:
                core = resp.json().get("resources", {}).get("core", {})
                return {
                    "limit": core.get("limit", 60),
                    "remaining": core.get("remaining", 60),
                    "reset": core.get("reset", 0)
                }
            return {"limit": 60, "remaining": 60, "reset": 0}

github_service = GitHubService()
