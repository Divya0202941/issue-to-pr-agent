from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SyncSessionLocal
from app.db.models import AgentRun, GeneratedPatch, TestExecution, ReviewFinding
from app.schemas import GeneratedPatchRead, TestExecutionRead, ReviewFindingRead

router = APIRouter()

def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/{run_id}")
def get_code_review_data(run_id: str, db: Session = Depends(get_sync_db)):
    agent_run = db.query(AgentRun).filter(AgentRun.id == run_id).first()
    if not agent_run:
        raise HTTPException(status_code=404, detail="Agent run not found")
        
    patch = agent_run.patch
    test_exec = (
        db.query(TestExecution)
        .filter(TestExecution.agent_run_id == run_id)
        .order_by(TestExecution.execution_timestamp.desc())
        .first()
    )
    findings = db.query(ReviewFinding).filter(ReviewFinding.agent_run_id == run_id).all()
    
    return {
        "run_id": run_id,
        "repository_name": agent_run.repository.full_name,
        "issue_number": agent_run.issue.issue_number,
        "issue_title": agent_run.issue.title,
        "confidence_score": agent_run.confidence_score,
        "confidence_reason": agent_run.confidence_reason,
        "patch": GeneratedPatchRead.model_validate(patch) if patch else None,
        "latest_test_execution": TestExecutionRead.model_validate(test_exec) if test_exec else None,
        "review_findings": [ReviewFindingRead.model_validate(f) for f in findings],
        "is_approved": patch.is_approved if patch else False,
        "approved_at": patch.approved_at if patch else None
    }
