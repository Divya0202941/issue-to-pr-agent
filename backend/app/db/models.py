import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Text, JSON, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from app.db.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String(100), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=True)
    full_name = Column(String(255), nullable=True)
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    preferences = relationship("UserPreference", back_populates="user", uselist=False, cascade="all, delete-orphan")
    github_connection = relationship("GitHubConnection", back_populates="user", uselist=False, cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")

class GitHubConnection(Base):
    __tablename__ = "github_connections"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    github_username = Column(String(100), nullable=False)
    encrypted_token = Column(String(500), nullable=True)
    token_preview = Column(String(20), nullable=True)  # e.g. ghp_...1234
    scopes = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    connected_at = Column(DateTime, default=utc_now)
    
    user = relationship("User", back_populates="github_connection")

class Repository(Base):
    __tablename__ = "repositories"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    owner = Column(String(100), nullable=False, index=True)
    name = Column(String(100), nullable=False, index=True)
    full_name = Column(String(200), unique=True, nullable=False, index=True)
    is_private = Column(Boolean, default=False)
    default_branch = Column(String(100), default="main")
    description = Column(Text, nullable=True)
    language = Column(String(50), nullable=True)
    open_issues_count = Column(Integer, default=0)
    forks_count = Column(Integer, default=0)
    stars_count = Column(Integer, default=0)
    html_url = Column(String(500), nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    configuration = relationship("RepositoryConfiguration", back_populates="repository", uselist=False, cascade="all, delete-orphan")
    issues = relationship("IssueRecord", back_populates="repository", cascade="all, delete-orphan")
    agent_runs = relationship("AgentRun", back_populates="repository", cascade="all, delete-orphan")
    pull_requests = relationship("PullRequestRecord", back_populates="repository", cascade="all, delete-orphan")

class RepositoryConfiguration(Base):
    __tablename__ = "repository_configurations"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, unique=True)
    base_branch = Column(String(100), default="main")
    permitted_branches = Column(JSON, default=lambda: ["main", "master", "develop"])
    test_command = Column(String(255), default="pytest")
    build_command = Column(String(255), nullable=True)
    lint_command = Column(String(255), default="flake8")
    max_retries = Column(Integer, default=3)
    require_patch_approval = Column(Boolean, default=True)
    require_pr_approval = Column(Boolean, default=True)
    timeout_seconds = Column(Integer, default=60)
    allowed_paths = Column(JSON, default=lambda: ["*"])
    excluded_paths = Column(JSON, default=lambda: [".git", "node_modules", "venv", "__pycache__", ".env*"])
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    
    repository = relationship("Repository", back_populates="configuration")

class IssueRecord(Base):
    __tablename__ = "issues"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_number = Column(Integer, nullable=False)
    title = Column(String(500), nullable=False)
    body = Column(Text, nullable=True)
    author = Column(String(100), nullable=True)
    state = Column(String(50), default="open")
    labels = Column(JSON, default=list)
    html_url = Column(String(500), nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    
    repository = relationship("Repository", back_populates="issues")
    agent_runs = relationship("AgentRun", back_populates="issue")
    
    __table_args__ = (
        Index("idx_repo_issue_num", "repository_id", "issue_number", unique=True),
    )

class AgentRun(Base):
    __tablename__ = "agent_runs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    issue_id = Column(String, ForeignKey("issues.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # State machine status
    status = Column(String(50), default="draft", index=True)
    # Current agent
    current_agent = Column(String(50), default="issue_analyzer")
    
    branch_name = Column(String(150), nullable=False)
    base_branch = Column(String(100), default="main")
    
    correction_attempt = Column(Integer, default=0)
    max_correction_attempts = Column(Integer, default=3)
    
    confidence_score = Column(Float, default=0.0)
    confidence_reason = Column(Text, nullable=True)
    
    is_demo = Column(Boolean, default=False)
    error_message = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=utc_now, index=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    repository = relationship("Repository", back_populates="agent_runs")
    issue = relationship("IssueRecord", back_populates="agent_runs")
    executions = relationship("AgentExecution", back_populates="agent_run", cascade="all, delete-orphan", order_by="AgentExecution.started_at")
    logs = relationship("AgentExecutionLog", back_populates="agent_run", cascade="all, delete-orphan", order_by="AgentExecutionLog.timestamp")
    patch = relationship("GeneratedPatch", back_populates="agent_run", uselist=False, cascade="all, delete-orphan")
    test_executions = relationship("TestExecution", back_populates="agent_run", cascade="all, delete-orphan", order_by="TestExecution.execution_timestamp")
    review_findings = relationship("ReviewFinding", back_populates="agent_run", cascade="all, delete-orphan")
    pull_request = relationship("PullRequestRecord", back_populates="agent_run", uselist=False, cascade="all, delete-orphan")

    @property
    def repository_name(self) -> str:
        return self.repository.full_name if self.repository else "Unknown"

    @property
    def issue_number(self) -> int:
        return self.issue.issue_number if self.issue else 0

    @property
    def issue_title(self) -> str:
        return self.issue.title if self.issue else "No Title"

class AgentExecution(Base):
    __tablename__ = "agent_executions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent_run_id = Column(String, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_name = Column(String(50), nullable=False)  # issue_analyzer, code_locator, fix_generator, test_agent, reviewer, pr_agent
    status = Column(String(50), default="pending")   # pending, running, completed, failed, awaiting_approval, skipped
    started_at = Column(DateTime, nullable=True)
    finished_at = Column(DateTime, nullable=True)
    duration_seconds = Column(Float, default=0.0)
    output_data = Column(JSON, default=dict)
    error_message = Column(Text, nullable=True)
    
    agent_run = relationship("AgentRun", back_populates="executions")

class AgentExecutionLog(Base):
    __tablename__ = "agent_execution_logs"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent_run_id = Column(String, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    agent_name = Column(String(50), nullable=False)
    level = Column(String(20), default="INFO")  # INFO, WARN, ERROR, DEBUG
    message = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=utc_now, index=True)
    
    agent_run = relationship("AgentRun", back_populates="logs")

class GeneratedPatch(Base):
    __tablename__ = "generated_patches"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent_run_id = Column(String, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, unique=True)
    patch_content = Column(Text, nullable=False) # unified diff
    change_summary = Column(Text, nullable=True)
    explanation = Column(Text, nullable=True)
    files_changed = Column(JSON, default=list) # [{file_path, additions, deletions, status, old_content, new_content}]
    is_approved = Column(Boolean, default=False)
    approved_at = Column(DateTime, nullable=True)
    approved_by = Column(String(100), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    
    agent_run = relationship("AgentRun", back_populates="patch")

class TestExecution(Base):
    __test__ = False
    __tablename__ = "test_executions"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent_run_id = Column(String, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    test_command = Column(String(255), nullable=False)
    exit_code = Column(Integer, default=0)
    stdout = Column(Text, default="")
    stderr = Column(Text, default="")
    passed_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    skipped_count = Column(Integer, default=0)
    duration_seconds = Column(Float, default=0.0)
    sandbox_type = Column(String(50), default="isolated_process")
    execution_timestamp = Column(DateTime, default=utc_now)
    
    agent_run = relationship("AgentRun", back_populates="test_executions")

class ReviewFinding(Base):
    __tablename__ = "review_findings"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent_run_id = Column(String, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(50), default="correctness")  # security, correctness, regression, style, maintainability
    severity = Column(String(20), default="warning")      # critical, warning, suggestion
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    file_path = Column(String(255), nullable=True)
    line_number = Column(Integer, nullable=True)
    resolution_status = Column(String(50), default="open")  # open, addressed, dismissed
    
    agent_run = relationship("AgentRun", back_populates="review_findings")

class PullRequestRecord(Base):
    __tablename__ = "pull_requests"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    agent_run_id = Column(String, ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, unique=True)
    repository_id = Column(String, ForeignKey("repositories.id", ondelete="CASCADE"), nullable=False, index=True)
    pr_number = Column(Integer, nullable=True)
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    html_url = Column(String(500), nullable=True)
    head_branch = Column(String(150), nullable=False)
    base_branch = Column(String(100), default="main")
    state = Column(String(50), default="open")  # open, draft, merged, closed
    checks_passing = Column(Boolean, default=True)
    is_approved = Column(Boolean, default=False)
    approved_at = Column(DateTime, nullable=True)
    is_demo = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)
    
    agent_run = relationship("AgentRun", back_populates="pull_request")
    repository = relationship("Repository", back_populates="pull_requests")

class AuditEvent(Base):
    __tablename__ = "audit_events"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    actor = Column(String(100), default="system")
    event_type = Column(String(100), nullable=False, index=True)
    repository_name = Column(String(200), nullable=True)
    workflow_id = Column(String(100), nullable=True, index=True)
    details = Column(JSON, default=dict)
    result = Column(String(50), default="success")  # success, failure, warning
    timestamp = Column(DateTime, default=utc_now, index=True)

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="info")  # info, success, warning, error
    link = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=utc_now, index=True)
    
    user = relationship("User", back_populates="notifications")

class UserPreference(Base):
    __tablename__ = "user_preferences"
    
    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    theme = Column(String(20), default="dark")  # dark, light, system
    notify_on_complete = Column(Boolean, default=True)
    notify_on_failure = Column(Boolean, default=True)
    notify_on_approval = Column(Boolean, default=True)
    ai_provider = Column(String(50), default="mock")
    default_max_retries = Column(Integer, default=3)
    
    user = relationship("User", back_populates="preferences")
