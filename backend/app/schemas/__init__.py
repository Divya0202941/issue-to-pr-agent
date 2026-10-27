from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict

# Base schemas
class UserBase(BaseModel):
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class UserRead(UserBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Repository Configuration
class RepositoryConfigBase(BaseModel):
    base_branch: str = "main"
    permitted_branches: List[str] = ["main", "master", "develop"]
    test_command: str = "pytest"
    build_command: Optional[str] = None
    lint_command: Optional[str] = "flake8"
    max_retries: int = 3
    require_patch_approval: bool = True
    require_pr_approval: bool = True
    timeout_seconds: int = 60
    allowed_paths: List[str] = ["*"]
    excluded_paths: List[str] = [".git", "node_modules", "venv", "__pycache__", ".env*"]

class RepositoryConfigUpdate(BaseModel):
    base_branch: Optional[str] = None
    permitted_branches: Optional[List[str]] = None
    test_command: Optional[str] = None
    build_command: Optional[str] = None
    lint_command: Optional[str] = None
    max_retries: Optional[int] = None
    require_patch_approval: Optional[bool] = None
    require_pr_approval: Optional[bool] = None
    timeout_seconds: Optional[int] = None
    allowed_paths: Optional[List[str]] = None
    excluded_paths: Optional[List[str]] = None

class RepositoryConfigRead(RepositoryConfigBase):
    id: str
    repository_id: str
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Repository Schemas
class RepositoryRead(BaseModel):
    id: str
    owner: str
    name: str
    full_name: str
    is_private: bool
    default_branch: str
    description: Optional[str] = None
    language: Optional[str] = None
    open_issues_count: int = 0
    forks_count: int = 0
    stars_count: int = 0
    html_url: Optional[str] = None
    is_demo: bool = False
    created_at: datetime
    configuration: Optional[RepositoryConfigRead] = None
    agent_runs_count: int = 0
    pull_requests_count: int = 0
    model_config = ConfigDict(from_attributes=True)

class RepositoryConnectRequest(BaseModel):
    full_name: str  # owner/repo
    base_branch: Optional[str] = "main"
    is_demo: bool = False

# Issue Schemas
class IssueValidationRequest(BaseModel):
    issue_url: str

class IssueValidationResponse(BaseModel):
    is_valid: bool
    owner: Optional[str] = None
    repo: Optional[str] = None
    issue_number: Optional[int] = None
    error: Optional[str] = None

class IssueRead(BaseModel):
    id: str
    repository_id: str
    issue_number: int
    title: str
    body: Optional[str] = None
    author: Optional[str] = None
    state: str = "open"
    labels: List[str] = []
    html_url: Optional[str] = None
    is_demo: bool = False
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Agent Execution and Log Schemas
class AgentExecutionLogRead(BaseModel):
    id: str
    agent_name: str
    level: str
    message: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class AgentExecutionRead(BaseModel):
    id: str
    agent_name: str
    status: str
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    duration_seconds: float = 0.0
    output_data: Dict[str, Any] = {}
    error_message: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

# Patch & Diff Schemas
class ChangedFileItem(BaseModel):
    file_path: str
    additions: int = 0
    deletions: int = 0
    status: str = "modified"  # modified, added, deleted
    old_content: Optional[str] = None
    new_content: Optional[str] = None
    diff: Optional[str] = None

class GeneratedPatchRead(BaseModel):
    id: str
    agent_run_id: str
    patch_content: str
    change_summary: Optional[str] = None
    explanation: Optional[str] = None
    files_changed: List[ChangedFileItem] = []
    is_approved: bool = False
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PatchApprovalRequest(BaseModel):
    approved: bool
    rejection_reason: Optional[str] = None

# Test Execution Schemas
class TestExecutionRead(BaseModel):
    id: str
    agent_run_id: str
    test_command: str
    exit_code: int
    stdout: str
    stderr: str
    passed_count: int
    failed_count: int
    skipped_count: int
    duration_seconds: float
    sandbox_type: str
    execution_timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# Review Findings Schemas
class ReviewFindingRead(BaseModel):
    id: str
    agent_run_id: str
    category: str
    severity: str
    title: str
    description: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    resolution_status: str
    model_config = ConfigDict(from_attributes=True)

# Pull Request Schemas
class PullRequestRead(BaseModel):
    id: str
    agent_run_id: str
    repository_id: str
    pr_number: Optional[int] = None
    title: str
    description: Optional[str] = None
    html_url: Optional[str] = None
    head_branch: str
    base_branch: str
    state: str = "open"
    checks_passing: bool = True
    is_approved: bool = False
    approved_at: Optional[datetime] = None
    is_demo: bool = False
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PRApprovalRequest(BaseModel):
    approved: bool

# Agent Run Schemas
class AgentRunCreate(BaseModel):
    issue_url: str
    base_branch: Optional[str] = None
    ai_provider: Optional[str] = None
    model: Optional[str] = None
    is_demo: Optional[bool] = None

class AgentRunSummary(BaseModel):
    id: str
    repository_id: str
    repository_name: Optional[str] = "Unknown"
    issue_id: str
    issue_number: Optional[int] = 0
    issue_title: Optional[str] = "No Title"
    status: str
    current_agent: str
    branch_name: str
    base_branch: str
    correction_attempt: int
    max_correction_attempts: int
    confidence_score: float
    confidence_reason: Optional[str] = None
    is_demo: bool
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

class AgentRunDetail(AgentRunSummary):
    executions: List[AgentExecutionRead] = []
    logs: List[AgentExecutionLogRead] = []
    patch: Optional[GeneratedPatchRead] = None
    test_executions: List[TestExecutionRead] = []
    review_findings: List[ReviewFindingRead] = []
    pull_request: Optional[PullRequestRead] = None
    issue: Optional[IssueRead] = None
    repository: Optional[RepositoryRead] = None
    model_config = ConfigDict(from_attributes=True)

# Notifications Schemas
class NotificationRead(BaseModel):
    id: str
    title: str
    message: str
    type: str
    link: Optional[str] = None
    is_read: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Audit Event Schemas
class AuditEventRead(BaseModel):
    id: str
    actor: str
    event_type: str
    repository_name: Optional[str] = None
    workflow_id: Optional[str] = None
    details: Dict[str, Any] = {}
    result: str
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

# Analytics Schemas
class AnalyticsSummary(BaseModel):
    total_runs: int = 0
    successful_runs: int = 0
    failed_runs: int = 0
    active_runs: int = 0
    prs_created: int = 0
    issues_processed: int = 0
    test_pass_rate: float = 0.0
    avg_duration_seconds: float = 0.0
    weekly_activity: List[Dict[str, Any]] = []
    runs_by_status: List[Dict[str, Any]] = []
    agent_durations: List[Dict[str, Any]] = []
    failure_categories: List[Dict[str, Any]] = []

# Settings Schemas
class UserPreferencesUpdate(BaseModel):
    theme: Optional[str] = None
    notify_on_complete: Optional[bool] = None
    notify_on_failure: Optional[bool] = None
    notify_on_approval: Optional[bool] = None
    ai_provider: Optional[str] = None
    default_max_retries: Optional[int] = None

class AIProviderConfig(BaseModel):
    provider: str  # mock, openai, anthropic, gemini
    api_key: Optional[str] = None
    model: Optional[str] = None

class AIProviderStatus(BaseModel):
    provider: str
    is_configured: bool
    active_model: str
    latency_ms: Optional[int] = None
    status: str = "operational" # operational, unconfigured, error
