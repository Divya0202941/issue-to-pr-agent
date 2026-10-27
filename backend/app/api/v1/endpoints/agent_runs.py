import asyncio
import json
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from sse_starlette.sse import EventSourceResponse
from sqlalchemy.orm import Session, joinedload
from app.db.session import SyncSessionLocal
from app.db.models import AgentRun, IssueRecord, Repository, GeneratedPatch, PullRequestRecord, AgentExecution, AgentExecutionLog
from app.schemas import (
    AgentRunCreate, AgentRunSummary, AgentRunDetail, PatchApprovalRequest, PRApprovalRequest
)
from app.agents.orchestrator import orchestrator
from app.core.security import parse_and_validate_github_issue_url
from app.services.audit_service import audit_service
from app.services.github_service import github_service

router = APIRouter()

def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("", response_model=AgentRunSummary)
async def create_agent_run(
    payload: AgentRunCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_sync_db)
):
    is_valid, owner, repo_name, issue_number, error = parse_and_validate_github_issue_url(payload.issue_url)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error)
        
    full_name = f"{owner}/{repo_name}"
    
    # Resolve demo mode:
    # If explicitly passed in payload, use it.
    # If owner is acme-corp, it is a demo scenario.
    # Otherwise, if GitHub token is present, it's a live GitHub run (is_demo=False).
    if payload.is_demo is not None:
        run_is_demo = payload.is_demo
    elif owner == "acme-corp":
        run_is_demo = True
    else:
        run_is_demo = not bool(github_service.token)

    repo = db.query(Repository).filter(Repository.full_name == full_name).first()
    if not repo:
        repo = Repository(
            owner=owner,
            name=repo_name,
            full_name=full_name,
            default_branch=payload.base_branch or "main",
            html_url=f"https://github.com/{full_name}",
            is_demo=run_is_demo
        )
        db.add(repo)
        db.commit()
        db.refresh(repo)
    elif payload.is_demo is not None:
        repo.is_demo = run_is_demo
        db.commit()
        
    issue = (
        db.query(IssueRecord)
        .filter(IssueRecord.repository_id == repo.id, IssueRecord.issue_number == issue_number)
        .first()
    )
    if not issue:
        # Try fetching real issue title if token available and not demo
        issue_title = f"Resolve GitHub issue #{issue_number}"
        issue_body = "Task generated from GitHub issue URL."
        if not run_is_demo and github_service.token:
            try:
                gh_issue = await github_service.get_issue(owner, repo_name, issue_number)
                issue_title = gh_issue.get("title", issue_title)
                issue_body = gh_issue.get("body", issue_body)
            except Exception:
                pass

        issue = IssueRecord(
            repository_id=repo.id,
            issue_number=issue_number,
            title=issue_title,
            body=issue_body,
            state="open",
            html_url=payload.issue_url,
            is_demo=run_is_demo
        )
        db.add(issue)
        db.commit()
        db.refresh(issue)
        
    branch_name = f"agent/fix-issue-{issue_number}"
    base_branch = payload.base_branch or repo.default_branch or "main"
    
    agent_run = AgentRun(
        repository_id=repo.id,
        issue_id=issue.id,
        status="validating_issue",
        current_agent="issue_analyzer",
        branch_name=branch_name,
        base_branch=base_branch,
        correction_attempt=0,
        max_correction_attempts=3,
        confidence_score=0.9,
        is_demo=run_is_demo,
        created_at=datetime.utcnow()
    )
    db.add(agent_run)
    db.commit()
    db.refresh(agent_run)
    
    audit_service.log_event(
        db=db,
        event_type="WORKFLOW_STARTED",
        actor="user",
        repository_name=repo.full_name,
        workflow_id=agent_run.id,
        details={"issue_url": payload.issue_url, "branch": branch_name}
    )
    
    # Launch agent pipeline asynchronously in background
    background_tasks.add_task(orchestrator.execute_workflow, agent_run.id)
    
    return AgentRunSummary(
        id=agent_run.id,
        repository_id=repo.id,
        repository_name=repo.full_name,
        issue_id=issue.id,
        issue_number=issue.issue_number,
        issue_title=issue.title,
        status=agent_run.status,
        current_agent=agent_run.current_agent,
        branch_name=agent_run.branch_name,
        base_branch=agent_run.base_branch,
        correction_attempt=agent_run.correction_attempt,
        max_correction_attempts=agent_run.max_correction_attempts,
        confidence_score=agent_run.confidence_score,
        confidence_reason=agent_run.confidence_reason,
        is_demo=agent_run.is_demo,
        error_message=agent_run.error_message,
        created_at=agent_run.created_at,
        completed_at=agent_run.completed_at
    )

@router.get("", response_model=List[AgentRunSummary])
def list_agent_runs(
    repository_id: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_sync_db)
):
    query = db.query(AgentRun)
    if repository_id:
        query = query.filter(AgentRun.repository_id == repository_id)
    if status:
        query = query.filter(AgentRun.status == status)
        
    runs = query.order_by(AgentRun.created_at.desc()).all()
    results = []
    for r in runs:
        results.append(AgentRunSummary(
            id=r.id,
            repository_id=r.repository_id,
            repository_name=r.repository.full_name if r.repository else "Unknown",
            issue_id=r.issue_id,
            issue_number=r.issue.issue_number if r.issue else 0,
            issue_title=r.issue.title if r.issue else "Issue",
            status=r.status,
            current_agent=r.current_agent,
            branch_name=r.branch_name,
            base_branch=r.base_branch,
            correction_attempt=r.correction_attempt,
            max_correction_attempts=r.max_correction_attempts,
            confidence_score=r.confidence_score,
            confidence_reason=r.confidence_reason,
            is_demo=r.is_demo,
            error_message=r.error_message,
            created_at=r.created_at,
            completed_at=r.completed_at
        ))
    return results

@router.get("/{id}", response_model=AgentRunDetail)
def get_agent_run(id: str, db: Session = Depends(get_sync_db)):
    agent_run = db.query(AgentRun).options(
        joinedload(AgentRun.repository),
        joinedload(AgentRun.issue),
        joinedload(AgentRun.executions),
        joinedload(AgentRun.logs),
        joinedload(AgentRun.patch),
        joinedload(AgentRun.test_executions),
        joinedload(AgentRun.review_findings),
        joinedload(AgentRun.pull_request)
    ).filter(AgentRun.id == id).first()
    if not agent_run:
        raise HTTPException(status_code=404, detail="Agent run not found")
    return agent_run

@router.get("/{id}/events")
async def stream_agent_run_events(id: str, request: Request):
    """Server-Sent Events endpoint streaming live state and log updates."""
    queue = orchestrator.subscribe(id)
    
    async def event_generator():
        try:
            # Send initial ping event
            yield {
                "event": "connected",
                "data": json.dumps({"run_id": id, "status": "connected"})
            }
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event_data = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield {
                        "event": event_data.get("type", "update"),
                        "data": json.dumps(event_data)
                    }
                except asyncio.TimeoutError:
                    # Keep-alive heartbeat
                    yield {
                        "event": "ping",
                        "data": json.dumps({"timestamp": datetime.utcnow().isoformat()})
                    }
        finally:
            orchestrator.unsubscribe(id, queue)

    return EventSourceResponse(event_generator())

@router.post("/{id}/approve-patch")
async def approve_patch(
    id: str,
    payload: PatchApprovalRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_sync_db)
):
    agent_run = db.query(AgentRun).filter(AgentRun.id == id).first()
    if not agent_run:
        raise HTTPException(status_code=404, detail="Agent run not found")
        
    patch = agent_run.patch
    if not patch:
        raise HTTPException(status_code=400, detail="No patch found to approve")
        
    if payload.approved:
        patch.is_approved = True
        patch.approved_at = datetime.utcnow()
        patch.approved_by = "user"
        agent_run.status = "applying_changes"
        db.commit()
        
        audit_service.log_event(
            db=db,
            event_type="PATCH_APPROVED",
            actor="user",
            repository_name=agent_run.repository.full_name,
            workflow_id=agent_run.id
        )
        
        # Resume orchestrator workflow
        background_tasks.add_task(orchestrator.execute_workflow, agent_run.id, True)
        return {"status": "approved", "workflow": "resumed"}
    else:
        patch.is_approved = False
        patch.rejection_reason = payload.rejection_reason or "Rejected by user"
        agent_run.status = "correction_required"
        db.commit()
        
        audit_service.log_event(
            db=db,
            event_type="PATCH_REJECTED",
            actor="user",
            repository_name=agent_run.repository.full_name,
            workflow_id=agent_run.id,
            details={"reason": patch.rejection_reason}
        )
        return {"status": "rejected", "reason": patch.rejection_reason}

@router.post("/{id}/approve-pr")
async def approve_pull_request(
    id: str,
    payload: PRApprovalRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_sync_db)
):
    agent_run = db.query(AgentRun).filter(AgentRun.id == id).first()
    if not agent_run:
        raise HTTPException(status_code=404, detail="Agent run not found")
        
    if payload.approved:
        pr = agent_run.pull_request
        if pr:
            pr.is_approved = True
            pr.approved_at = datetime.utcnow()
        else:
            pr = PullRequestRecord(
                agent_run_id=agent_run.id,
                repository_id=agent_run.repository_id,
                title=f"Fix issue #{agent_run.issue.issue_number}: {agent_run.issue.title}" if agent_run.issue else "Fix issue",
                head_branch=agent_run.branch_name,
                base_branch=agent_run.base_branch,
                state="open",
                is_approved=True,
                approved_at=datetime.utcnow(),
                is_demo=agent_run.is_demo
            )
            db.add(pr)
        agent_run.status = "creating_pull_request"
        db.commit()
        
        audit_service.log_event(
            db=db,
            event_type="PR_APPROVED",
            actor="user",
            repository_name=agent_run.repository.full_name,
            workflow_id=agent_run.id
        )
        
        background_tasks.add_task(orchestrator.execute_workflow, agent_run.id, True)
        return {"status": "pr_approved", "workflow": "resumed"}
    else:
        agent_run.status = "cancelled"
        db.commit()
        return {"status": "pr_rejected"}

@router.post("/{id}/cancel")
def cancel_agent_run(id: str, db: Session = Depends(get_sync_db)):
    agent_run = db.query(AgentRun).filter(AgentRun.id == id).first()
    if not agent_run:
        raise HTTPException(status_code=404, detail="Agent run not found")
        
    if agent_run.status in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Run has already finished")
        
    agent_run.status = "cancelled"
    db.commit()
    
    audit_service.log_event(
        db=db,
        event_type="WORKFLOW_CANCELLED",
        actor="user",
        repository_name=agent_run.repository.full_name,
        workflow_id=agent_run.id
    )
    return {"status": "cancelled"}

@router.post("/{id}/retry")
def retry_agent_run(id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_sync_db)):
    agent_run = db.query(AgentRun).filter(AgentRun.id == id).first()
    if not agent_run:
        raise HTTPException(status_code=404, detail="Agent run not found")
        
    agent_run.status = "validating_issue"
    agent_run.current_agent = "issue_analyzer"
    agent_run.correction_attempt = 0
    agent_run.error_message = None
    db.commit()
    
    background_tasks.add_task(orchestrator.execute_workflow, agent_run.id)
    return {"status": "retrying"}
