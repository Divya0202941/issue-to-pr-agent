import os
import base64
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings

def sanitize_github_token(raw: Optional[str]) -> Optional[str]:
    """
    Safely sanitizes a GitHub token:
    - Strips whitespace, tabs, and newlines.
    - Strips surrounding single or double quotes.
    - Removes superfluous 'Bearer ' or 'token ' prefixes.
    - Never exposes or logs the token.
    """
    if not raw:
        return None
    token = str(raw).strip()
    if not token:
        return None
    # Strip wrapping quotes
    if (token.startswith('"') and token.endswith('"')) or (token.startswith("'") and token.endswith("'")):
        token = token[1:-1].strip()
    # Strip redundant Bearer / token authorization schemes
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    elif token.lower().startswith("token "):
        token = token[6:].strip()
    # Strip any remaining quote artifacts
    token = token.strip().strip('"\'')
    return token if token else None

class GitHubService:
    def __init__(self, token: Optional[str] = None):
        self._token = token
        self.api_base = settings.GITHUB_API_BASE
        
    @property
    def token(self) -> Optional[str]:
        """Dynamically resolves and sanitizes token from explicit instance, environment, settings, or database."""
        # 1. Explicit instance token
        if self._token:
            sanitized = sanitize_github_token(self._token)
            if sanitized:
                return sanitized
            
        # 2. Environment variables: GITHUB_TOKEN, GH_TOKEN, GITHUB_PAT, settings.GITHUB_TOKEN
        env_token = (
            os.getenv("GITHUB_TOKEN") or
            os.getenv("GH_TOKEN") or
            os.getenv("GITHUB_PAT") or
            settings.GITHUB_TOKEN
        )
        if env_token:
            sanitized = sanitize_github_token(env_token)
            if sanitized:
                return sanitized
            
        # 3. Database connection stored by user in Settings
        try:
            from app.db.session import SyncSessionLocal
            from app.db.models import GitHubConnection
            with SyncSessionLocal() as session:
                conn = session.query(GitHubConnection).filter(GitHubConnection.is_active == True).first()
                if conn and conn.encrypted_token:
                    sanitized = sanitize_github_token(conn.encrypted_token)
                    if sanitized:
                        return sanitized
        except Exception:
            pass
            
        return None

    @token.setter
    def token(self, value: Optional[str]):
        self._token = value

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "Issue-to-PR-Agent/1.0",
            "X-GitHub-Api-Version": "2022-11-28"
        }
        current_token = self.token
        if current_token:
            headers["Authorization"] = f"Bearer {current_token}"
        return headers

    @staticmethod
    def _parse_github_error(resp: httpx.Response, action_description: str, owner: str = "", repo: str = "") -> Exception:
        """
        Parses GitHub error responses into specific, actionable exceptions
        without leaking token credentials into logs.
        """
        repo_label = f" for '{owner}/{repo}'" if owner and repo else ""
        github_message = ""
        try:
            data = resp.json()
            if isinstance(data, dict):
                github_message = data.get("message", "")
                errors = data.get("errors")
                if errors and isinstance(errors, list):
                    err_msgs = [e.get("message") for e in errors if isinstance(e, dict) and e.get("message")]
                    if err_msgs:
                        github_message = f"{github_message} ({'; '.join(err_msgs)})"
        except Exception:
            github_message = resp.text[:200] if resp.text else ""

        if not github_message:
            github_message = resp.reason_phrase or "Unknown error"

        if resp.status_code == 401:
            return PermissionError(
                f"GitHub authentication failed (HTTP 401: {github_message}){repo_label}. "
                "The configured GITHUB_TOKEN is invalid, expired, revoked, or malformed. "
                "Please verify or regenerate your GitHub Personal Access Token on GitHub and update it on Render."
            )
        elif resp.status_code == 403:
            msg_lower = github_message.lower()
            if "rate limit" in msg_lower:
                return PermissionError(
                    f"GitHub API rate limit exceeded (HTTP 403: {github_message}){repo_label}. "
                    "Please wait for rate limit reset or configure an authenticated GITHUB_TOKEN."
                )
            return PermissionError(
                f"GitHub permission denied (HTTP 403: {github_message}){repo_label}. "
                "The token lacks required permissions on this repository. "
                "For Fine-grained Personal Access Tokens, ensure: "
                "1) Target repository is selected under 'Repository access'; "
                "2) 'Contents' permission is set to 'Read and write' (for branches and commits); "
                "3) 'Pull requests' permission is set to 'Read and write' (for opening PRs)."
            )
        elif resp.status_code == 404:
            return ValueError(
                f"GitHub repository or resource not found (HTTP 404: {github_message}){repo_label}. "
                "If the repository is private or access is restricted by Fine-grained token settings, "
                "ensure your token has access to this repository."
            )
        elif resp.status_code == 422:
            return ValueError(f"GitHub validation error (HTTP 422: {github_message}){repo_label}.")
        else:
            return RuntimeError(
                f"GitHub API error during {action_description} (HTTP {resp.status_code}: {github_message}){repo_label}."
            )

    async def get_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """Fetches repository metadata from GitHub API."""
        url = f"{self.api_base}/repos/{owner}/{repo}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code != 200:
                raise self._parse_github_error(resp, "repository verification", owner, repo)
            return resp.json()

    async def get_issue(self, owner: str, repo: str, issue_number: int) -> Dict[str, Any]:
        """Fetches issue details including title, body, labels, state."""
        url = f"{self.api_base}/repos/{owner}/{repo}/issues/{issue_number}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code != 200:
                raise self._parse_github_error(resp, f"fetching issue #{issue_number}", owner, repo)
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
            raise PermissionError("A valid GitHub token is required to create branches. Please configure GITHUB_TOKEN.")
        
        headers = self._get_headers()
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Get base branch commit SHA
            ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/ref/heads/{base_branch}"
            resp = await client.get(ref_url, headers=headers)
            
            if resp.status_code == 404:
                # Try fetching repository to determine actual default branch
                try:
                    repo_info = await self.get_repository(owner, repo)
                    actual_default = repo_info.get("default_branch", "main")
                    if actual_default != base_branch:
                        ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/ref/heads/{actual_default}"
                        resp = await client.get(ref_url, headers=headers)
                except Exception:
                    pass
            
            if resp.status_code != 200:
                raise self._parse_github_error(resp, f"resolving base branch '{base_branch}'", owner, repo)
                
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
                # Branch might have been created concurrently or already exists
                return {"branch": branch_name, "status": "already_exists", "sha": sha}
            if create_resp.status_code not in (200, 201):
                raise self._parse_github_error(create_resp, f"creating branch '{branch_name}'", owner, repo)
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
            raise PermissionError("A valid GitHub token is required to commit files. Please configure GITHUB_TOKEN.")
            
        if not files:
            raise ValueError("No files provided to commit.")

        headers = self._get_headers()
        async with httpx.AsyncClient(timeout=30.0) as client:
            # 1. Get HEAD commit of the branch
            ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/ref/heads/{branch_name}"
            ref_resp = await client.get(ref_url, headers=headers)
            if ref_resp.status_code != 200:
                raise self._parse_github_error(ref_resp, f"fetching HEAD of branch '{branch_name}'", owner, repo)
            head_commit_sha = ref_resp.json()["object"]["sha"]

            # 2. Get tree SHA of HEAD commit
            commit_url = f"{self.api_base}/repos/{owner}/{repo}/git/commits/{head_commit_sha}"
            commit_resp = await client.get(commit_url, headers=headers)
            if commit_resp.status_code != 200:
                raise self._parse_github_error(commit_resp, f"fetching tree of commit {head_commit_sha[:7]}", owner, repo)
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
                if blob_resp.status_code not in (200, 201):
                    raise self._parse_github_error(blob_resp, f"creating file blob for '{path}'", owner, repo)
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
            if tree_resp.status_code not in (200, 201):
                raise self._parse_github_error(tree_resp, "creating git tree", owner, repo)
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
            if new_commit_resp.status_code not in (200, 201):
                raise self._parse_github_error(new_commit_resp, "creating git commit", owner, repo)
            new_commit_sha = new_commit_resp.json()["sha"]

            # 6. Update branch ref to point to new commit
            update_ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/refs/heads/{branch_name}"
            update_ref_resp = await client.patch(
                update_ref_url,
                headers=headers,
                json={"sha": new_commit_sha, "force": False}
            )
            if update_ref_resp.status_code != 200:
                raise self._parse_github_error(update_ref_resp, f"updating branch ref '{branch_name}'", owner, repo)

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
                raise self._parse_github_error(resp, "creating pull request", owner, repo)
            elif resp.status_code not in (200, 201):
                raise self._parse_github_error(resp, "creating pull request", owner, repo)
            return resp.json()

    async def verify_token(self, token_override: Optional[str] = None) -> Dict[str, Any]:
        """
        Tests whether the token is valid with GitHub API without exposing secrets.
        Works for both classic and fine-grained PATs via /rate_limit endpoint.
        """
        tok = sanitize_github_token(token_override) if token_override else self.token
        if not tok:
            return {
                "configured": False,
                "valid": False,
                "token_type": "none",
                "error": "No GitHub token configured. Set GITHUB_TOKEN environment variable."
            }

        token_type = "fine-grained" if tok.startswith("github_pat_") else ("classic" if tok.startswith("ghp_") else "other")
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "Issue-to-PR-Agent/1.0",
            "X-GitHub-Api-Version": "2022-11-28",
            "Authorization": f"Bearer {tok}"
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.api_base}/rate_limit", headers=headers)
            if resp.status_code == 200:
                data = resp.json().get("resources", {}).get("core", {})
                return {
                    "configured": True,
                    "valid": True,
                    "token_type": token_type,
                    "remaining_rate_limit": data.get("remaining", 0),
                    "total_rate_limit": data.get("limit", 0),
                    "error": None
                }
            elif resp.status_code == 401:
                return {
                    "configured": True,
                    "valid": False,
                    "token_type": token_type,
                    "error": "HTTP 401: Bad credentials (token is invalid, expired, revoked, or malformed)"
                }
            else:
                return {
                    "configured": True,
                    "valid": False,
                    "token_type": token_type,
                    "error": f"HTTP {resp.status_code}: {resp.text[:150]}"
                }

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
