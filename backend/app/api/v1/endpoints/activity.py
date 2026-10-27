from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import SyncSessionLocal
from app.db.models import AuditEvent
from app.schemas import AuditEventRead

router = APIRouter()

def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[AuditEventRead])
def list_activity_logs(
    event_type: Optional[str] = None,
    actor: Optional[str] = None,
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_sync_db)
):
    query = db.query(AuditEvent)
    if event_type:
        query = query.filter(AuditEvent.event_type == event_type)
    if actor:
        query = query.filter(AuditEvent.actor == actor)
        
    return query.order_by(AuditEvent.timestamp.desc()).limit(limit).all()
