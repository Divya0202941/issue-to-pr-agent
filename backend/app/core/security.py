import re
from typing import Tuple, Optional
from urllib.parse import urlparse

GITHUB_ISSUE_URL_REGEX = re.compile(
    r"^https://github\.com/([a-zA-Z0-9_\-\.]+)/([a-zA-Z0-9_\-\.]+)/issues/(\d+)$"
)

SAFE_BRANCH_NAME_REGEX = re.compile(r"^[a-zA-Z0-9_\-\./]+$")

# Deny malicious commands in repository configs
DANGEROUS_COMMAND_PATTERNS = [
    r"rm\s+-rf\s+[/~]",
    r":\(\)\{\s*:\|:&\s*\};:", # fork bomb
    r"curl.*\|\s*sh",
    r"wget.*\|\s*sh",
    r"sudo",
    r"chmod\s+-R\s+777",
    r">/dev/sd",
    r"mkfs",
    r"dd\s+if=",
]

def parse_and_validate_github_issue_url(url: str) -> Tuple[bool, Optional[str], Optional[str], Optional[int], Optional[str]]:
    """
    Validates GitHub issue URL and extracts owner, repo, issue_number.
    Prevents SSRF and path traversal.
    Returns: (is_valid, owner, repo, issue_number, error_message)
    """
    if not url or not isinstance(url, str):
        return False, None, None, None, "Issue URL is required"
    
    url = url.strip()
    try:
        parsed = urlparse(url)
        if parsed.scheme != "https":
            return False, None, None, None, "URL must use https scheme"
        if parsed.netloc.lower() != "github.com":
            return False, None, None, None, "Only github.com URLs are permitted"
    except Exception as e:
        return False, None, None, None, f"Malformed URL: {str(e)}"
    
    match = GITHUB_ISSUE_URL_REGEX.match(url)
    if not match:
        return False, None, None, None, "Invalid GitHub issue URL format. Expected: https://github.com/owner/repo/issues/123"
    
    owner, repo, issue_num_str = match.groups()
    try:
        issue_number = int(issue_num_str)
    except ValueError:
        return False, None, None, None, "Issue number must be an integer"
        
    return True, owner, repo, issue_number, None

def mask_secret(secret: Optional[str]) -> str:
    """Masks secret tokens for safe UI display and logging."""
    if not secret:
        return ""
    if len(secret) <= 8:
        return "********"
    return f"{secret[:4]}...{secret[-4:]}"

def validate_safe_command(command: str) -> Tuple[bool, Optional[str]]:
    """Checks whether a test or build command contains known dangerous shell constructs."""
    if not command:
        return True, None
    for pattern in DANGEROUS_COMMAND_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return False, f"Command contains potentially unsafe pattern: {pattern}"
    return True, None

def validate_branch_name(branch_name: str) -> bool:
    """Validates branch name format against git ref requirements."""
    if not branch_name or len(branch_name) > 100:
        return False
    if ".." in branch_name or branch_name.startswith("/") or branch_name.endswith("/"):
        return False
    return bool(SAFE_BRANCH_NAME_REGEX.match(branch_name))
