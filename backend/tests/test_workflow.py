import os
import sys
import uuid
import random
import pytest
import asyncio

# Ensure backend root is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from app.db.init_db import init_database
from app.db.seed_data import seed_database
from app.db.session import SyncSessionLocal
from app.db.models import (
    User, Repository, RepositoryConfiguration, IssueRecord,
    AgentRun, GeneratedPatch, TestExecution as TestExecutionModel,
    ReviewFinding, PullRequestRecord
)
from app.agents.issue_analyzer import issue_analyzer_agent
from app.agents.code_locator import code_locator_agent
from app.agents.fix_generator import fix_generator_agent
from app.agents.test_agent import test_agent
from app.agents.reviewer import reviewer_agent
from app.agents.pr_agent import pr_agent
from app.agents.orchestrator import orchestrator

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    init_database()
    seed_database()

@pytest.mark.asyncio
async def test_six_agents_individual_execution():
    """Verifies that all 6 agents can be invoked directly and output valid structured data."""
    db = SyncSessionLocal()
    try:
        repo = db.query(Repository).filter(Repository.full_name == "acme-corp/auth-service").first()
        assert repo is not None

        issue_num = random.randint(10000, 999999)
        issue = IssueRecord(
            id=str(uuid.uuid4()),
            repository_id=repo.id,
            issue_number=issue_num,
            title="Fix null pointer exception when JWT secret is missing",
            body="When JWT_SECRET is unset, the auth middleware crashes with NullPointerException. Expected graceful error.",
            author="tester",
            is_demo=True
        )
        db.add(issue)
        db.commit()

        run = AgentRun(
            id=str(uuid.uuid4()),
            repository_id=repo.id,
            issue_id=issue.id,
            status="draft",
            current_agent="issue_analyzer",
            branch_name=f"agent/issue-{issue_num}-fix-jwt",
            base_branch="main",
            confidence_score=0.95,
            is_demo=True
        )
        db.add(run)
        db.commit()

        context = {}

        # 1. Issue Analyzer
        analyzer_res = await issue_analyzer_agent.execute(run, db, context)
        assert "summary" in analyzer_res
        assert "acceptance_criteria" in analyzer_res
        context["issue_analysis"] = analyzer_res

        # 2. Code Locator
        locator_res = await code_locator_agent.execute(run, db, context)
        assert "relevant_files" in locator_res
        assert len(locator_res["relevant_files"]) > 0
        context["code_location"] = locator_res

        # 3. Fix Generator
        fix_res = await fix_generator_agent.execute(run, db, context)
        assert "patch_content" in fix_res
        assert "files_changed" in fix_res
        assert len(fix_res["files_changed"]) > 0
        context["fix_result"] = fix_res

        # Verify patch record created
        patch = db.query(GeneratedPatch).filter(GeneratedPatch.agent_run_id == run.id).first()
        assert patch is not None
        assert patch.is_approved is False

        # 4. Test Agent
        test_res = await test_agent.execute(run, db, context)
        assert "passed_count" in test_res
        assert test_res["passed_count"] > 0
        assert "sandbox_type" in test_res
        context["test_result"] = test_res

        # 5. Reviewer Agent
        review_res = await reviewer_agent.execute(run, db, context)
        assert "verdict" in review_res
        assert "confidence_score" in review_res
        context["review_result"] = review_res

        # 6. PR Agent - verify human approval gate is strictly enforced
        with pytest.raises(ValueError, match="Human patch approval has not been granted"):
            await pr_agent.execute(run, db, context)

        # Grant human patch approval
        patch.is_approved = True
        db.commit()

        # Now PR Agent should execute successfully
        pr_res = await pr_agent.execute(run, db, context)
        assert "title" in pr_res
        assert "html_url" in pr_res
        assert "head_branch" in pr_res
        assert "pr_number" in pr_res

        # Verify PR record created
        pr_rec = db.query(PullRequestRecord).filter(PullRequestRecord.agent_run_id == run.id).first()
        assert pr_rec is not None
        assert pr_rec.checks_passing is True
        assert pr_rec.state == "open"
        assert pr_rec.is_demo is True

    finally:
        db.close()

@pytest.mark.asyncio
async def test_full_orchestrator_pipeline_with_approval_gates():
    """
    Verifies full end-to-end execution through the orchestrator:
    Intake -> Steps 1-3 -> Pause at Patch Approval -> Approve Patch ->
    Steps 4-5 (with self-correction loop) -> Pause at PR Approval -> Approve PR -> Step 6 -> Completed.
    """
    db = SyncSessionLocal()
    try:
        repo = db.query(Repository).filter(Repository.full_name == "acme-corp/auth-service").first()
        assert repo is not None

        issue_num = random.randint(10000, 999999)
        issue = IssueRecord(
            id=str(uuid.uuid4()),
            repository_id=repo.id,
            issue_number=issue_num,
            title="Add rate limiting header to auth endpoints",
            body="Expose X-RateLimit-Remaining and X-RateLimit-Reset headers on 429 response.",
            author="tester",
            is_demo=True
        )
        db.add(issue)
        db.commit()

        run = AgentRun(
            id=str(uuid.uuid4()),
            repository_id=repo.id,
            issue_id=issue.id,
            status="validating_issue",
            current_agent="issue_analyzer",
            branch_name=f"agent/issue-{issue_num}-rate-limit",
            base_branch="main",
            confidence_score=0.92,
            is_demo=True
        )
        db.add(run)
        db.commit()

        # Step A: Run workflow until Gate 1 (Patch approval)
        await orchestrator.execute_workflow(run.id, resume_from_approval=False)

        db.refresh(run)
        assert run.status == "awaiting_patch_approval"
        patch = db.query(GeneratedPatch).filter(GeneratedPatch.agent_run_id == run.id).first()
        assert patch is not None
        assert patch.is_approved is False

        # Step B: User approves the patch
        patch.is_approved = True
        run.status = "applying_changes"
        db.commit()

        # Step C: Resume workflow from Patch approval until Gate 2 (PR approval)
        await orchestrator.execute_workflow(run.id, resume_from_approval=True)

        db.refresh(run)
        assert run.status == "awaiting_pr_approval"
        test_execs = db.query(TestExecutionModel).filter(TestExecutionModel.agent_run_id == run.id).order_by(TestExecutionModel.execution_timestamp.desc()).all()
        assert len(test_execs) >= 1
        assert any(t.passed_count > 0 for t in test_execs)

        # Step D: User approves PR creation
        pr_record = PullRequestRecord(
            agent_run_id=run.id,
            repository_id=repo.id,
            title=f"Fix issue #{issue.issue_number}: {issue.title}",
            head_branch=run.branch_name,
            base_branch=run.base_branch,
            state="open",
            is_approved=True,
            is_demo=True
        )
        db.add(pr_record)
        run.status = "creating_pull_request"
        db.commit()

        # Step E: Resume workflow from PR approval to completion
        await orchestrator.execute_workflow(run.id, resume_from_approval=True)

        db.refresh(run)
        assert run.status == "completed"
        assert run.completed_at is not None

        final_pr = db.query(PullRequestRecord).filter(PullRequestRecord.agent_run_id == run.id).first()
        assert final_pr is not None
        assert final_pr.html_url is not None
        assert "acme-corp/auth-service" in final_pr.html_url
        assert final_pr.checks_passing is True

    finally:
        db.close()
