from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SyncSessionLocal
from app.db.models import PullRequestRecord, Repository
from app.schemas import PullRequestRead

router = APIRouter()

def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[PullRequestRead])
def list_pull_requests(
    repository_id: Optional[str] = None,
    state: Optional[str] = None,
    checks_passing: Optional[bool] = None,
    db: Session = Depends(get_sync_db)
):
    query = db.query(PullRequestRecord)
    if repository_id:
        query = query.filter(PullRequestRecord.repository_id == repository_id)
    if state:
        query = query.filter(PullRequestRecord.state == state)
    if checks_passing is not None:
        query = query.filter(PullRequestRecord.checks_passing == checks_passing)
        
    return query.order_by(PullRequestRecord.created_at.desc()).all()

@router.get("/{id}", response_model=PullRequestRead)
def get_pull_request(id: str, db: Session = Depends(get_sync_db)):
    pr = db.query(PullRequestRecord).filter(PullRequestRecord.id == id).first()
    if not pr:
        raise HTTPException(status_code=404, detail="Pull Request not found")
    return pr
