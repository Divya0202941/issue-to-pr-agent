import os
import sys

# Ensure backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

import uuid
import httpx
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.db.session import SyncSessionLocal
from app.db.models import Repository, IssueRecord, AgentRun, GeneratedPatch, PullRequestRecord
from app.agents.pr_agent import pr_agent
from app.services.github_service import github_service, sanitize_github_token

@pytest.fixture
def db_session():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def setup_test_run(db_session):
    uid = uuid.uuid4().hex[:8]
    repo = Repository(
        id=str(uuid.uuid4()),
        owner="test-owner",
        name=f"test-repo-{uid}",
        full_name=f"test-owner/test-repo-{uid}",
        default_branch="main",
        is_demo=False
    )
    db_session.add(repo)

    issue = IssueRecord(
        id=str(uuid.uuid4()),
        repository_id=repo.id,
        issue_number=101,
        title="Fix input validation",
        body="Reject whitespace usernames",
        state="open"
    )
    db_session.add(issue)

    run = AgentRun(
        id=str(uuid.uuid4()),
        repository_id=repo.id,
        issue_id=issue.id,
        status="in_progress",
        branch_name="agent/issue-101-fix-input",
        base_branch="main",
        is_demo=False
    )
    db_session.add(run)

    patch_record = GeneratedPatch(
        id=str(uuid.uuid4()),
        agent_run_id=run.id,
        patch_content="diff --git a/app.py b/app.py...",
        change_summary="Fixed validation for empty and whitespace usernames",
        files_changed=[{"file_path": "app.py", "new_content": "def validate(): pass"}],
        is_approved=False
    )
    db_session.add(patch_record)
    db_session.commit()

    return {"repo": repo, "issue": issue, "run": run, "patch": patch_record}

# =========================================================================
# 1. Token Sanitization Tests
# =========================================================================
def test_sanitize_github_token_formats():
    """Verify that sanitize_github_token correctly handles quotes, whitespace, and prefixes."""
    assert sanitize_github_token(None) is None
    assert sanitize_github_token("") is None
    assert sanitize_github_token("   ") is None
    
    # Classic token clean
    assert sanitize_github_token("ghp_1234567890abcdef") == "ghp_1234567890abcdef"
    # Fine-grained token clean
    assert sanitize_github_token("github_pat_11AAAAA_BBBBB") == "github_pat_11AAAAA_BBBBB"
    # Stripping surrounding quotes
    assert sanitize_github_token('"github_pat_11AAAAA_BBBBB"') == "github_pat_11AAAAA_BBBBB"
    assert sanitize_github_token("'github_pat_11AAAAA_BBBBB'") == "github_pat_11AAAAA_BBBBB"
    # Stripping Bearer prefix (case-insensitive)
    assert sanitize_github_token("Bearer github_pat_11AAAAA_BBBBB") == "github_pat_11AAAAA_BBBBB"
    assert sanitize_github_token("bearer  github_pat_11AAAAA_BBBBB") == "github_pat_11AAAAA_BBBBB"
    assert sanitize_github_token("token ghp_1234567890abcdef") == "ghp_1234567890abcdef"
    # Combined messy input with newlines and quotes
    assert sanitize_github_token('  "Bearer github_pat_11AAAAA_BBBBB \n\r"  ') == "github_pat_11AAAAA_BBBBB"

# =========================================================================
# 2. Approval Gate Tests
# =========================================================================
@pytest.mark.asyncio
async def test_pr_agent_requires_human_patch_approval(db_session, setup_test_run):
    """PR Agent must refuse to open a PR if the human approval gate has not been passed."""
    run = setup_test_run["run"]
    context = {"test_result": {"passed_count": 3}}

    with pytest.raises(ValueError, match="Human patch approval has not been granted"):
        await pr_agent.execute(run, db_session, context)

# =========================================================================
# 3. Missing Token Tests
# =========================================================================
@pytest.mark.asyncio
async def test_pr_agent_live_mode_missing_token_raises_error(db_session, setup_test_run):
    """In live mode (is_demo=False), missing GitHub token raises PermissionError."""
    run = setup_test_run["run"]
    patch_record = setup_test_run["patch"]
    patch_record.is_approved = True
    db_session.commit()

    context = {"test_result": {"passed_count": 3}}

    with patch.object(github_service.__class__, "token", new=None):
        with pytest.raises(PermissionError, match="GitHub Personal Access Token is required"):
            await pr_agent.execute(run, db_session, context)

# =========================================================================
# 4. GitHub API Error Distinctions (401 Bad Credentials vs 403 vs 404)
# =========================================================================
@pytest.mark.asyncio
async def test_get_repository_401_invalid_credentials():
    """Verify that HTTP 401 returns actionable message regarding invalid/expired token."""
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 401
    mock_resp.json.return_value = {"message": "Bad credentials"}
    mock_resp.text = '{"message": "Bad credentials"}'
    mock_resp.reason_phrase = "Unauthorized"

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        with pytest.raises(PermissionError) as exc_info:
            await github_service.get_repository("my-org", "my-repo")
        assert "HTTP 401: Bad credentials" in str(exc_info.value)
        assert "invalid, expired, revoked, or malformed" in str(exc_info.value)

@pytest.mark.asyncio
async def test_get_repository_403_insufficient_permissions():
    """Verify that HTTP 403 explains missing repository permissions for fine-grained tokens."""
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 403
    mock_resp.json.return_value = {"message": "Resource not accessible by personal access token"}
    mock_resp.text = '{"message": "Resource not accessible by personal access token"}'
    mock_resp.reason_phrase = "Forbidden"

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        with pytest.raises(PermissionError) as exc_info:
            await github_service.get_repository("my-org", "my-repo")
        assert "HTTP 403: Resource not accessible" in str(exc_info.value)
        assert "Contents" in str(exc_info.value)
        assert "Pull requests" in str(exc_info.value)

@pytest.mark.asyncio
async def test_get_repository_404_not_found():
    """Verify that HTTP 404 returns actionable missing repo / permission message."""
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 404
    mock_resp.json.return_value = {"message": "Not Found"}
    mock_resp.text = '{"message": "Not Found"}'
    mock_resp.reason_phrase = "Not Found"

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        with pytest.raises(ValueError) as exc_info:
            await github_service.get_repository("my-org", "my-repo")
        assert "HTTP 404: Not Found" in str(exc_info.value)

# =========================================================================
# 5. Successful Live Mode PR Creation with Fine-Grained PAT
# =========================================================================
@pytest.mark.asyncio
async def test_pr_agent_live_mode_creates_real_pr(db_session, setup_test_run):
    """In live mode, PR Agent calls GitHub Git Data & Pull Request APIs and saves confirmed PR."""
    repo = setup_test_run["repo"]
    run = setup_test_run["run"]
    patch_record = setup_test_run["patch"]
    patch_record.is_approved = True
    db_session.commit()

    context = {"test_result": {"passed_count": 3}}

    mock_repo = {"id": 12345, "name": repo.name, "owner": {"login": "test-owner"}}
    mock_branch = {"ref": "refs/heads/agent/issue-101-fix-input"}
    mock_commit = {"commit_sha": "abc1234567"}
    mock_pr = {
        "number": 42,
        "html_url": f"https://github.com/test-owner/{repo.name}/pull/42",
        "title": "fix: resolve #101 - Fix input validation",
        "state": "open"
    }

    fine_grained_pat = "github_pat_11AABBCCDDEEFFGGHHIIJJ"
    with patch.object(github_service.__class__, "token", new=fine_grained_pat):
        with patch.object(github_service, "get_repository", new_callable=AsyncMock, return_value=mock_repo) as mock_get_repo, \
             patch.object(github_service, "create_branch", new_callable=AsyncMock, return_value=mock_branch) as mock_create_branch, \
             patch.object(github_service, "commit_files", new_callable=AsyncMock, return_value=mock_commit) as mock_commit_files, \
             patch.object(github_service, "create_pull_request", new_callable=AsyncMock, return_value=mock_pr) as mock_create_pr:

            result = await pr_agent.execute(run, db_session, context)

            mock_get_repo.assert_awaited_once_with("test-owner", repo.name)
            mock_create_branch.assert_awaited_once_with("test-owner", repo.name, "agent/issue-101-fix-input", "main")
            mock_commit_files.assert_awaited_once()
            mock_create_pr.assert_awaited_once()

            assert result["pr_number"] == 42
            assert result["html_url"] == f"https://github.com/test-owner/{repo.name}/pull/42"
            assert result["is_demo"] is False

            # Verify persisted record
            pr_rec = db_session.query(PullRequestRecord).filter(PullRequestRecord.agent_run_id == run.id).first()
            assert pr_rec is not None
            assert pr_rec.pr_number == 42
            assert pr_rec.html_url == f"https://github.com/test-owner/{repo.name}/pull/42"
            assert pr_rec.is_demo is False
            assert pr_rec.is_approved is True

# =========================================================================
# 6. Existing Branch & Duplicate PR Handling
# =========================================================================
@pytest.mark.asyncio
async def test_create_pull_request_duplicate_existing_pr():
    """Verify that when GitHub returns 422 because PR exists, the existing open PR is returned."""
    mock_422_resp = MagicMock(spec=httpx.Response)
    mock_422_resp.status_code = 422
    mock_422_resp.json.return_value = {
        "message": "Validation Failed",
        "errors": [{"message": "A pull request already exists for test-owner:agent/issue-101-fix-input."}]
    }

    mock_existing_pr = {
        "number": 88,
        "html_url": "https://github.com/test-owner/my-repo/pull/88",
        "title": "fix: resolve #101",
        "state": "open"
    }

    mock_list_resp = MagicMock(spec=httpx.Response)
    mock_list_resp.status_code = 200
    mock_list_resp.json.return_value = [mock_existing_pr]

    with patch.object(github_service.__class__, "token", new="ghp_test_token_123"):
        with patch("httpx.AsyncClient.post", new_callable=AsyncMock, return_value=mock_422_resp):
            with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_list_resp):
                pr = await github_service.create_pull_request(
                    owner="test-owner",
                    repo="my-repo",
                    title="fix: resolve #101",
                    body="Body",
                    head_branch="agent/issue-101-fix-input",
                    base_branch="main"
                )
                assert pr["number"] == 88
                assert pr["html_url"] == "https://github.com/test-owner/my-repo/pull/88"

# =========================================================================
# 7. Diagnostic Token Verification Endpoint Test
# =========================================================================
@pytest.mark.asyncio
async def test_verify_token_diagnostic():
    """Verify that verify_token identifies valid tokens and returns rate limit information."""
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "resources": {
            "core": {"limit": 5000, "remaining": 4990, "reset": 1700000000}
        }
    }

    with patch("httpx.AsyncClient.get", new_callable=AsyncMock, return_value=mock_resp):
        res = await github_service.verify_token("github_pat_11validtoken")
        assert res["valid"] is True
        assert res["token_type"] == "fine-grained"
        assert res["remaining_rate_limit"] == 4990

# =========================================================================
# 8. Demo Mode Simulation
# =========================================================================
@pytest.mark.asyncio
async def test_pr_agent_demo_mode_simulation(db_session, setup_test_run):
    """In demo mode (is_demo=True), PR Agent simulates PR locally without calling GitHub API."""
    run = setup_test_run["run"]
    run.is_demo = True
    patch_record = setup_test_run["patch"]
    patch_record.is_approved = True
    db_session.commit()

    context = {"test_result": {"passed_count": 3}}

    with patch.object(github_service, "create_pull_request", new_callable=AsyncMock) as mock_create_pr:
        result = await pr_agent.execute(run, db_session, context)

        mock_create_pr.assert_not_called()
        assert result["is_demo"] is True
        assert result["pr_number"] is not None
        assert "pull" in result["html_url"]

        pr_rec = db_session.query(PullRequestRecord).filter(PullRequestRecord.agent_run_id == run.id).first()
        assert pr_rec is not None
        assert pr_rec.is_demo is True
