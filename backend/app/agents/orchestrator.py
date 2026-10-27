import asyncio
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.db.session import SyncSessionLocal
from app.db.models import AgentRun, GeneratedPatch, PullRequestRecord, AuditEvent
from app.agents.issue_analyzer import issue_analyzer_agent
from app.agents.code_locator import code_locator_agent
from app.agents.fix_generator import fix_generator_agent
from app.agents.test_agent import test_agent
from app.agents.reviewer import reviewer_agent
from app.agents.pr_agent import pr_agent
from app.services.audit_service import audit_service
from app.services.notification_service import notification_service

class AgentOrchestrator:
    def __init__(self):
        # In-memory subscriber queues for SSE live streaming updates: {run_id: [asyncio.Queue]}
        self._listeners: Dict[str, List[asyncio.Queue]] = {}

    def subscribe(self, run_id: str) -> asyncio.Queue:
        queue = asyncio.Queue()
        if run_id not in self._listeners:
            self._listeners[run_id] = []
        self._listeners[run_id].append(queue)
        return queue

    def unsubscribe(self, run_id: str, queue: asyncio.Queue):
        if run_id in self._listeners and queue in self._listeners[run_id]:
            self._listeners[run_id].remove(queue)
            if not self._listeners[run_id]:
                del self._listeners[run_id]

    async def broadcast_event(self, run_id: str, event_data: Dict[str, Any]):
        """Pushes real-time SSE events to all connected clients for a run."""
        if run_id in self._listeners:
            for queue in list(self._listeners[run_id]):
                try:
                    await queue.put(event_data)
                except Exception:
                    pass

    async def update_status(self, run_id: str, status: str, current_agent: str, db: Session):
        """Updates run status and broadcasts to SSE subscribers."""
        agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
        if agent_run:
            agent_run.status = status
            agent_run.current_agent = current_agent
            agent_run.updated_at = datetime.utcnow()
            db.commit()
            
        await self.broadcast_event(run_id, {
            "type": "state_change",
            "run_id": run_id,
            "status": status,
            "current_agent": current_agent,
            "timestamp": datetime.utcnow().isoformat()
        })

    async def execute_workflow(self, run_id: str, resume_from_approval: bool = False):
        """
        Executes the full 6-agent pipeline with human approval gates and bounded self-correction loops.
        Can run as a background task.
        """
        db = SyncSessionLocal()
        try:
            agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
            if not agent_run:
                return

            repo_config = agent_run.repository.configuration
            require_patch_approval = repo_config.require_patch_approval if repo_config else True
            require_pr_approval = repo_config.require_pr_approval if repo_config else True
            
            context: Dict[str, Any] = {}

            # STEP 1: Issue Analysis (if not resuming)
            if not resume_from_approval and agent_run.status in ["draft", "validating_issue"]:
                await self.update_status(run_id, "analyzing_issue", "issue_analyzer", db)
                analysis_output = await issue_analyzer_agent.execute(agent_run, db, context)
                context["issue_analysis"] = analysis_output

                # STEP 2: Code Location
                await self.update_status(run_id, "locating_code", "code_locator", db)
                location_output = await code_locator_agent.execute(agent_run, db, context)
                context["code_location"] = location_output

                # STEP 3: Fix Generation
                await self.update_status(run_id, "generating_patch", "fix_generator", db)
                fix_output = await fix_generator_agent.execute(agent_run, db, context)
                context["fix_result"] = fix_output

                # GATE 1: Patch Approval Gate
                if require_patch_approval:
                    await self.update_status(run_id, "awaiting_patch_approval", "fix_generator", db)
                    audit_service.log_event(
                        db=db,
                        event_type="APPROVAL_REQUESTED",
                        actor="system",
                        repository_name=agent_run.repository.full_name,
                        workflow_id=agent_run.id,
                        details={"type": "patch_approval", "summary": fix_output.get("change_summary")}
                    )
                    notification_service.create_notification(
                        db=db,
                        title="Patch Approval Required",
                        message=f"Agent generated a patch for issue #{agent_run.issue.issue_number}. Please review and approve.",
                        type="warning",
                        link=f"/agent-runs/{agent_run.id}"
                    )
                    # Pause workflow and await user interaction
                    return
            else:
                # Reload context from existing run records
                context["issue_analysis"] = {
                    "summary": agent_run.issue.title,
                    "requirements": ["Sanitize and validate inputs properly"],
                    "acceptance_criteria": ["All pytest assertions pass"]
                }
                patch_record = db.query(GeneratedPatch).filter(GeneratedPatch.agent_run_id == run_id).first()
                if patch_record:
                    context["fix_result"] = {
                        "patch_content": patch_record.patch_content,
                        "change_summary": patch_record.change_summary,
                        "files_changed": patch_record.files_changed or []
                    }

            # STEP 4: Test Agent Execution & Review Loop
            correction_attempts = agent_run.correction_attempt or 0
            max_corrections = agent_run.max_correction_attempts or 3
            review_approved = False

            while correction_attempts <= max_corrections and not review_approved:
                # Check for cancellation
                db.refresh(agent_run)
                if agent_run.status == "cancelled":
                    return

                # Generate and run tests in isolated sandbox
                await self.update_status(run_id, "running_tests", "test_agent", db)
                test_output = await test_agent.execute(agent_run, db, context)
                context["test_result"] = test_output

                # STEP 5: Reviewer Agent
                await self.update_status(run_id, "reviewing_changes", "reviewer", db)
                review_output = await reviewer_agent.execute(agent_run, db, context)
                context["review_result"] = review_output

                # Evaluate Reviewer decision
                verdict = review_output.get("verdict", "approved")
                requires_correction = review_output.get("requires_correction", False)

                if (verdict == "approved" or not requires_correction) and test_output.get("failed_count", 0) == 0:
                    review_approved = True
                    break
                else:
                    correction_attempts += 1
                    agent_run.correction_attempt = correction_attempts
                    db.commit()

                    if correction_attempts > max_corrections:
                        # Max retries exceeded
                        agent_run.status = "failed"
                        agent_run.error_message = f"Maximum correction attempts ({max_corrections}) reached without resolving review findings."
                        db.commit()
                        await self.update_status(run_id, "failed", "reviewer", db)
                        notification_service.create_notification(
                            db=db,
                            title="Workflow Failed",
                            message=f"Agent run for issue #{agent_run.issue.issue_number} exceeded max retries.",
                            type="error",
                            link=f"/agent-runs/{agent_run.id}"
                        )
                        return

                    # Trigger bounded correction loop
                    await self.update_status(run_id, "correction_required", "reviewer", db)
                    await asyncio.sleep(1.0)
                    context["reviewer_feedback"] = review_output
                    
                    await self.update_status(run_id, "generating_patch", "fix_generator", db)
                    revised_fix = await fix_generator_agent.execute(agent_run, db, context)
                    context["fix_result"] = revised_fix

            # GATE 2: Pull Request Approval Gate
            if require_pr_approval and agent_run.status != "creating_pull_request":
                # Check if PR approval already granted
                pr_record = db.query(PullRequestRecord).filter(PullRequestRecord.agent_run_id == run_id).first()
                if not (pr_record and pr_record.is_approved):
                    await self.update_status(run_id, "awaiting_pr_approval", "reviewer", db)
                    audit_service.log_event(
                        db=db,
                        event_type="PR_APPROVAL_REQUESTED",
                        actor="system",
                        repository_name=agent_run.repository.full_name,
                        workflow_id=agent_run.id,
                        details={"status": "tests_passed", "correction_attempts": correction_attempts}
                    )
                    notification_service.create_notification(
                        db=db,
                        title="PR Creation Approval Required",
                        message=f"Tests passed for issue #{agent_run.issue.issue_number}. Ready to open Pull Request.",
                        type="info",
                        link=f"/agent-runs/{agent_run.id}"
                    )
                    return

            # STEP 6: PR Agent Execution
            await self.update_status(run_id, "creating_pull_request", "pr_agent", db)
            pr_output = await pr_agent.execute(agent_run, db, context)
            context["pr_result"] = pr_output

            # Mark Completed
            agent_run.status = "completed"
            agent_run.completed_at = datetime.utcnow()
            db.commit()
            
            await self.update_status(run_id, "completed", "pr_agent", db)
            
            audit_service.log_event(
                db=db,
                event_type="WORKFLOW_COMPLETED",
                actor="system",
                repository_name=agent_run.repository.full_name,
                workflow_id=agent_run.id,
                details={"pr_url": pr_output.get("html_url"), "attempts": correction_attempts}
            )
            
            notification_service.create_notification(
                db=db,
                title="Pull Request Ready for Review",
                message=f"Pull Request created for issue #{agent_run.issue.issue_number}. Pending human merge approval.",
                type="success",
                link=f"/agent-runs/{agent_run.id}"
            )

        except Exception as e:
            if agent_run:
                agent_run.status = "failed"
                agent_run.error_message = str(e)
                agent_run.completed_at = datetime.utcnow()
                db.commit()
                await self.broadcast_event(run_id, {
                    "type": "error",
                    "run_id": run_id,
                    "error": str(e),
                    "timestamp": datetime.utcnow().isoformat()
                })
        finally:
            db.close()

orchestrator = AgentOrchestrator()
