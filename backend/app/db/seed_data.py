import uuid
from datetime import datetime, timedelta
from app.db.session import SyncSessionLocal
from app.db.models import (
    User, GitHubConnection, Repository, RepositoryConfiguration,
    IssueRecord, AgentRun, AgentExecution, AgentExecutionLog,
    GeneratedPatch, TestExecution, ReviewFinding, PullRequestRecord,
    AuditEvent, Notification, UserPreference
)

def seed_database():
    db = SyncSessionLocal()
    try:
        # Check if already seeded
        if db.query(User).first():
            print("Database already contains data, skipping seed.")
            return

        print("Seeding demo database with initial scenarios and repositories...")

        # 1. Create Default Demo User
        user = User(
            id=str(uuid.uuid4()),
            username="alex_dev",
            email="alex@engineering.internal",
            full_name="Alex Mercer",
            avatar_url="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
            created_at=datetime.utcnow() - timedelta(days=30)
        )
        db.add(user)

        # 2. User Preferences
        pref = UserPreference(
            user_id=user.id,
            theme="dark",
            notify_on_complete=True,
            notify_on_failure=True,
            notify_on_approval=True,
            ai_provider="mock",
            default_max_retries=3
        )
        db.add(pref)

        # 3. GitHub Connection (Mock/Demo connection)
        gh_conn = GitHubConnection(
            user_id=user.id,
            github_username="alexmercer-dev",
            token_preview="ghp_****a1b2",
            scopes="repo, read:user, workflow",
            is_active=True,
            connected_at=datetime.utcnow() - timedelta(days=20)
        )
        db.add(gh_conn)

        # 4. Repositories
        repo_auth = Repository(
            id="repo-auth-service",
            owner="acme-corp",
            name="auth-service",
            full_name="acme-corp/auth-service",
            is_private=False,
            default_branch="main",
            description="Core authentication and user identity service for Acme platform.",
            language="Python",
            open_issues_count=3,
            forks_count=14,
            stars_count=89,
            html_url="https://github.com/acme-corp/auth-service",
            is_demo=True,
            created_at=datetime.utcnow() - timedelta(days=60)
        )
        db.add(repo_auth)

        repo_api = Repository(
            id="repo-api-gateway",
            owner="acme-corp",
            name="api-gateway",
            full_name="acme-corp/api-gateway",
            is_private=True,
            default_branch="main",
            description="High-throughput reverse proxy and routing gateway with token bucket rate limiting.",
            language="TypeScript",
            open_issues_count=1,
            forks_count=4,
            stars_count=32,
            html_url="https://github.com/acme-corp/api-gateway",
            is_demo=True,
            created_at=datetime.utcnow() - timedelta(days=45)
        )
        db.add(repo_api)

        # 5. Configurations
        config_auth = RepositoryConfiguration(
            repository_id=repo_auth.id,
            base_branch="main",
            permitted_branches=["main", "staging", "develop"],
            test_command="pytest",
            build_command=None,
            lint_command="flake8",
            max_retries=3,
            require_patch_approval=True,
            require_pr_approval=True,
            timeout_seconds=60,
            allowed_paths=["*"],
            excluded_paths=[".git", "node_modules", "venv", "__pycache__"]
        )
        db.add(config_auth)

        config_api = RepositoryConfiguration(
            repository_id=repo_api.id,
            base_branch="main",
            permitted_branches=["main"],
            test_command="npm test",
            build_command="npm run build",
            lint_command="npm run lint",
            max_retries=2,
            require_patch_approval=True,
            require_pr_approval=True,
            timeout_seconds=90,
            allowed_paths=["src/*", "tests/*"],
            excluded_paths=[".git", "dist", "node_modules"]
        )
        db.add(config_api)

        # 6. Issues
        issue_1 = IssueRecord(
            id="issue-empty-validation",
            repository_id=repo_auth.id,
            issue_number=101,
            title="Fix incorrect validation for empty user input",
            body="The application currently accepts an empty username or whitespace-only strings under specific input paths in validate_user(). Validate the input consistently, raise ValueError, and add regression tests.",
            author="security-auditor",
            state="open",
            labels=["bug", "validation", "security"],
            html_url="https://github.com/acme-corp/auth-service/issues/101",
            is_demo=True,
            created_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(issue_1)

        issue_2 = IssueRecord(
            id="issue-jwt-expiry",
            repository_id=repo_auth.id,
            issue_number=102,
            title="Enforce maximum clock skew leeway in JWT expiration check",
            body="When validating tokens near the expiration boundary, allow a maximum 5-second clock skew tolerance before rejecting.",
            author="lead-architect",
            state="open",
            labels=["enhancement", "security"],
            html_url="https://github.com/acme-corp/auth-service/issues/102",
            is_demo=True,
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        db.add(issue_2)

        # 7. Completed Demo Agent Run (Issue #101 with full story)
        run_1 = AgentRun(
            id="run-demo-complete-101",
            repository_id=repo_auth.id,
            issue_id=issue_1.id,
            status="completed",
            current_agent="pr_agent",
            branch_name="fix/validate-empty-username-input",
            base_branch="main",
            correction_attempt=1,
            max_correction_attempts=3,
            confidence_score=0.98,
            confidence_reason="Boundary conditions verified against empty and whitespace inputs; 100% pytest pass rate in sandbox.",
            is_demo=True,
            created_at=datetime.utcnow() - timedelta(hours=3),
            updated_at=datetime.utcnow() - timedelta(hours=2, minutes=45),
            completed_at=datetime.utcnow() - timedelta(hours=2, minutes=45)
        )
        db.add(run_1)

        # Executions for run_1
        exec_1 = AgentExecution(
            agent_run_id=run_1.id,
            agent_name="issue_analyzer",
            status="completed",
            started_at=datetime.utcnow() - timedelta(hours=3),
            finished_at=datetime.utcnow() - timedelta(hours=2, minutes=58),
            duration_seconds=2.4,
            output_data={
                "summary": "Fix validation logic for empty and whitespace-only username inputs.",
                "acceptance_criteria": ["Reject empty string", "Reject whitespace-only string", "Raise ValueError"]
            }
        )
        exec_2 = AgentExecution(
            agent_run_id=run_1.id,
            agent_name="code_locator",
            status="completed",
            started_at=datetime.utcnow() - timedelta(hours=2, minutes=58),
            finished_at=datetime.utcnow() - timedelta(hours=2, minutes=56),
            duration_seconds=1.8,
            output_data={"relevant_files": [{"path": "app/validator.py", "relevance_score": 0.98}]}
        )
        exec_3 = AgentExecution(
            agent_run_id=run_1.id,
            agent_name="fix_generator",
            status="completed",
            started_at=datetime.utcnow() - timedelta(hours=2, minutes=56),
            finished_at=datetime.utcnow() - timedelta(hours=2, minutes=53),
            duration_seconds=3.1,
            output_data={"change_summary": "Added whitespace sanitization and validation checks"}
        )
        exec_4 = AgentExecution(
            agent_run_id=run_1.id,
            agent_name="test_agent",
            status="completed",
            started_at=datetime.utcnow() - timedelta(hours=2, minutes=53),
            finished_at=datetime.utcnow() - timedelta(hours=2, minutes=50),
            duration_seconds=2.9,
            output_data={"passed_count": 3, "failed_count": 0, "exit_code": 0}
        )
        exec_5 = AgentExecution(
            agent_run_id=run_1.id,
            agent_name="reviewer",
            status="completed",
            started_at=datetime.utcnow() - timedelta(hours=2, minutes=50),
            finished_at=datetime.utcnow() - timedelta(hours=2, minutes=48),
            duration_seconds=1.9,
            output_data={"verdict": "approved", "confidence_score": 0.98}
        )
        exec_6 = AgentExecution(
            agent_run_id=run_1.id,
            agent_name="pr_agent",
            status="completed",
            started_at=datetime.utcnow() - timedelta(hours=2, minutes=48),
            finished_at=datetime.utcnow() - timedelta(hours=2, minutes=45),
            duration_seconds=2.2,
            output_data={"pr_number": 104, "html_url": "https://github.com/acme-corp/auth-service/pull/104"}
        )
        db.add_all([exec_1, exec_2, exec_3, exec_4, exec_5, exec_6])

        # Execution Logs for run_1
        logs = [
            AgentExecutionLog(agent_run_id=run_1.id, agent_name="issue_analyzer", level="INFO", message="Issue Analyzer initialized for #101: 'Fix incorrect validation for empty user input'", timestamp=datetime.utcnow() - timedelta(hours=3)),
            AgentExecutionLog(agent_run_id=run_1.id, agent_name="issue_analyzer", level="INFO", message="Requirements extracted: 4 constraints, 3 acceptance criteria identified.", timestamp=datetime.utcnow() - timedelta(hours=2, minutes=59)),
            AgentExecutionLog(agent_run_id=run_1.id, agent_name="code_locator", level="INFO", message="Discovered candidate source file: app/validator.py (Relevance: 98%)", timestamp=datetime.utcnow() - timedelta(hours=2, minutes=58)),
            AgentExecutionLog(agent_run_id=run_1.id, agent_name="fix_generator", level="INFO", message="Generated patch with unified diff format (+2 / -2 lines)", timestamp=datetime.utcnow() - timedelta(hours=2, minutes=55)),
            AgentExecutionLog(agent_run_id=run_1.id, agent_name="test_agent", level="INFO", message="Created tests/test_validator.py with 3 regression test assertions.", timestamp=datetime.utcnow() - timedelta(hours=2, minutes=52)),
            AgentExecutionLog(agent_run_id=run_1.id, agent_name="test_agent", level="INFO", message="Sandbox execution passed (3 passed, 0 failed in 0.12s). Exit code: 0", timestamp=datetime.utcnow() - timedelta(hours=2, minutes=50)),
            AgentExecutionLog(agent_run_id=run_1.id, agent_name="reviewer", level="INFO", message="Reviewer approved patch with 98% confidence. Zero security findings.", timestamp=datetime.utcnow() - timedelta(hours=2, minutes=48)),
            AgentExecutionLog(agent_run_id=run_1.id, agent_name="pr_agent", level="INFO", message="Pull Request #104 published: https://github.com/acme-corp/auth-service/pull/104", timestamp=datetime.utcnow() - timedelta(hours=2, minutes=45)),
            AgentExecutionLog(agent_run_id=run_1.id, agent_name="pr_agent", level="INFO", message="Awaiting human review and merge approval on GitHub.", timestamp=datetime.utcnow() - timedelta(hours=2, minutes=45))
        ]
        db.add_all(logs)

        # Patch for run_1
        patch_1 = GeneratedPatch(
            agent_run_id=run_1.id,
            patch_content="""--- a/app/validator.py
+++ b/app/validator.py
@@ -1,4 +1,4 @@
 def validate_user(username: str):
-    if not username:
+    if not username or not username.strip():
         raise ValueError("Username cannot be empty")
     return {"username": username, "status": "active"}
""",
            change_summary="Enhanced validate_user() to reject empty or whitespace-only usernames using if not username or not username.strip().",
            explanation="Added `.strip()` validation ensuring usernames containing only whitespace characters trigger ValueError('Username cannot be empty') while preserving valid usernames.",
            files_changed=[
                {
                    "file_path": "app/validator.py",
                    "additions": 1,
                    "deletions": 1,
                    "status": "modified",
                    "old_content": 'def validate_user(username: str):\n    if not username:\n        raise ValueError("Username cannot be empty")\n    return {"username": username, "status": "active"}\n',
                    "new_content": 'def validate_user(username: str):\n    if not username or not username.strip():\n        raise ValueError("Username cannot be empty")\n    return {"username": username, "status": "active"}\n',
                    "diff": """--- a/app/validator.py
+++ b/app/validator.py
@@ -1,4 +1,4 @@
 def validate_user(username: str):
-    if not username:
+    if not username or not username.strip():
         raise ValueError("Username cannot be empty")
     return {"username": username, "status": "active"}
"""
                }
            ],
            is_approved=True,
            approved_at=datetime.utcnow() - timedelta(hours=2, minutes=54),
            approved_by="alex_dev",
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=55)
        )
        db.add(patch_1)

        # Test execution for run_1
        test_exec_1 = TestExecution(
            agent_run_id=run_1.id,
            test_command="pytest",
            exit_code=0,
            stdout="============================= test session starts =============================\nplatform win32 -- Python 3.14.5, pytest-9.1.1\nrootdir: C:\\temp\\sandbox\ncollected 3 items\n\ntests/test_validator.py ...                                              [100%]\n\n============================== 3 passed in 0.12s ==============================",
            stderr="",
            passed_count=3,
            failed_count=0,
            skipped_count=0,
            duration_seconds=0.85,
            sandbox_type="isolated_process",
            execution_timestamp=datetime.utcnow() - timedelta(hours=2, minutes=50)
        )
        db.add(test_exec_1)

        # Review finding
        finding_1 = ReviewFinding(
            agent_run_id=run_1.id,
            category="correctness",
            severity="suggestion",
            title="Clean input sanitization",
            description="username.strip() ensures input is properly trimmed before returning active status.",
            file_path="app/validator.py",
            line_number=2,
            resolution_status="addressed"
        )
        db.add(finding_1)

        # PR for run_1
        pr_1 = PullRequestRecord(
            agent_run_id=run_1.id,
            repository_id=repo_auth.id,
            pr_number=104,
            title="fix: validate empty and whitespace-only usernames in validate_user()",
            description="""## Summary
Resolves #101 by ensuring empty strings and whitespace-only input paths are rejected with a clear `ValueError`.

### Changes Made
- Updated `app/validator.py` with `.strip()` length validation.
- Added comprehensive unit tests in `tests/test_validator.py`.

### Test Results
- **Exit Code**: 0
- **Passed**: 3
- **Failed**: 0
- **Duration**: 0.12s

Verified in isolated execution sandbox. Awaiting human approval for final merge.
""",
            html_url="https://github.com/acme-corp/auth-service/pull/104",
            head_branch="fix/validate-empty-username-input",
            base_branch="main",
            state="open",
            checks_passing=True,
            is_approved=True,
            approved_at=datetime.utcnow() - timedelta(hours=2, minutes=45),
            is_demo=True,
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=45)
        )
        db.add(pr_1)

        # 8. Notifications
        notif_1 = Notification(
            user_id=user.id,
            title="Pull Request Ready for Review",
            message="PR #104 has been generated and validated for issue #101. Pending human merge approval.",
            type="success",
            link=f"/agent-runs/{run_1.id}",
            is_read=False,
            created_at=datetime.utcnow() - timedelta(hours=2, minutes=45)
        )
        notif_2 = Notification(
            user_id=user.id,
            title="System Ready",
            message="Issue to PR Agent initialized in Demo Mode. Connect your GitHub token in Settings anytime.",
            type="info",
            link="/settings",
            is_read=True,
            created_at=datetime.utcnow() - timedelta(days=1)
        )
        db.add_all([notif_1, notif_2])

        # 9. Audit Events
        audit_1 = AuditEvent(
            actor="alex_dev",
            event_type="ISSUE_SUBMITTED",
            repository_name="acme-corp/auth-service",
            workflow_id=run_1.id,
            details={"issue_number": 101, "title": "Fix incorrect validation for empty user input"},
            result="success",
            timestamp=datetime.utcnow() - timedelta(hours=3)
        )
        audit_2 = AuditEvent(
            actor="alex_dev",
            event_type="PATCH_APPROVED",
            repository_name="acme-corp/auth-service",
            workflow_id=run_1.id,
            details={"patch_id": patch_1.id, "approved_by": "alex_dev"},
            result="success",
            timestamp=datetime.utcnow() - timedelta(hours=2, minutes=54)
        )
        audit_3 = AuditEvent(
            actor="system",
            event_type="PR_CREATED",
            repository_name="acme-corp/auth-service",
            workflow_id=run_1.id,
            details={"pr_number": 104, "head_branch": "fix/validate-empty-username-input"},
            result="success",
            timestamp=datetime.utcnow() - timedelta(hours=2, minutes=45)
        )
        db.add_all([audit_1, audit_2, audit_3])

        db.commit()
        print("Database seeded successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {str(e)}")
        raise
    finally:
        db.close()

seed_demo_data = seed_database

if __name__ == "__main__":
    seed_database()
