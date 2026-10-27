from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db.models import AuditEvent

class AuditService:
    @staticmethod
    def log_event(
        db: Session,
        event_type: str,
        actor: str = "system",
        repository_name: Optional[str] = None,
        workflow_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        result: str = "success"
    ) -> AuditEvent:
        """Records an auditable security and lifecycle event."""
        event = AuditEvent(
            actor=actor,
            event_type=event_type,
            repository_name=repository_name,
            workflow_id=workflow_id,
            details=details or {},
            result=result,
            timestamp=datetime.utcnow()
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

audit_service = AuditService()
