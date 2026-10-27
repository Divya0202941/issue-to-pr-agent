from app.db.session import sync_engine, Base
from app.db.models import (
    User, GitHubConnection, Repository, RepositoryConfiguration,
    IssueRecord, AgentRun, AgentExecution, AgentExecutionLog,
    GeneratedPatch, TestExecution, ReviewFinding, PullRequestRecord,
    AuditEvent, Notification, UserPreference
)

def init_database():
    """Initializes all database tables synchronously."""
    Base.metadata.create_all(bind=sync_engine)
    print("Database tables created successfully.")

init_db = init_database

if __name__ == "__main__":
    init_database()
