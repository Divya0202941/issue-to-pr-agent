import base64
from typing import Dict, Any, List, Optional
import httpx
from app.core.config import settings

class GitHubService:
    def __init__(self, token: Optional[str] = None):
        self.token = token or settings.GITHUB_TOKEN
        self.api_base = settings.GITHUB_API_BASE
        
    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "User-Agent": "Issue-to-PR-Agent/1.0"
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def get_repository(self, owner: str, repo: str) -> Dict[str, Any]:
        """Fetches repository metadata from GitHub API."""
        url = f"{self.api_base}/repos/{owner}/{repo}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code == 404:
                raise ValueError(f"Repository {owner}/{repo} not found or not accessible.")
            elif resp.status_code == 401:
                raise PermissionError("Invalid GitHub credentials.")
            elif resp.status_code == 403:
                raise PermissionError("GitHub API rate limit exceeded or access forbidden.")
            resp.raise_for_status()
            return resp.json()

    async def get_issue(self, owner: str, repo: str, issue_number: int) -> Dict[str, Any]:
        """Fetches issue details including title, body, labels, state."""
        url = f"{self.api_base}/repos/{owner}/{repo}/issues/{issue_number}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code == 404:
                raise ValueError(f"Issue #{issue_number} in {owner}/{repo} was not found.")
            resp.raise_for_status()
            return resp.json()

    async def get_repository_tree(self, owner: str, repo: str, ref: str = "main") -> List[Dict[str, Any]]:
        """Fetches the file tree for a repository at a given ref/branch."""
        url = f"{self.api_base}/repos/{owner}/{repo}/git/trees/{ref}?recursive=1"
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.get(url, headers=self._get_headers())
            if resp.status_code != 200:
                # Return empty list if tree not available
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
        """Creates a git branch starting from the base_branch."""
        if not self.token:
            raise PermissionError("A valid GitHub token with 'repo' scope is required to create branches.")
        
        # Get base branch commit SHA
        ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/ref/heads/{base_branch}"
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(ref_url, headers=self._get_headers())
            if resp.status_code != 200:
                raise ValueError(f"Base branch '{base_branch}' not found in {owner}/{repo}.")
            sha = resp.json()["object"]["sha"]
            
            # Create new ref
            create_ref_url = f"{self.api_base}/repos/{owner}/{repo}/git/refs"
            payload = {
                "ref": f"refs/heads/{branch_name}",
                "sha": sha
            }
            create_resp = await client.post(create_ref_url, headers=self._get_headers(), json=payload)
            if create_resp.status_code == 422:
                # Branch might already exist
                return {"branch": branch_name, "status": "already_exists", "sha": sha}
            create_resp.raise_for_status()
            return create_resp.json()

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
            
        url = f"{self.api_base}/repos/{owner}/{repo}/pulls"
        payload = {
            "title": title,
            "body": body,
            "head": head_branch,
            "base": base_branch,
            "draft": False
        }
        async with httpx.AsyncClient(timeout=20.0) as client:
            resp = await client.post(url, headers=self._get_headers(), json=payload)
            if resp.status_code == 422:
                # PR might already exist for this branch
                error_detail = resp.json().get("errors", [{}])[0].get("message", "PR creation error")
                raise ValueError(f"GitHub PR creation failed: {error_detail}")
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
