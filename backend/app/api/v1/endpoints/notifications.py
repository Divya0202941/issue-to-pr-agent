from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SyncSessionLocal
from app.db.models import Notification
from app.schemas import NotificationRead

router = APIRouter()

def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("", response_model=List[NotificationRead])
def list_notifications(db: Session = Depends(get_sync_db)):
    return db.query(Notification).order_by(Notification.created_at.desc()).limit(50).all()

@router.put("/{id}/read")
def mark_notification_read(id: str, db: Session = Depends(get_sync_db)):
    notif = db.query(Notification).filter(Notification.id == id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    return {"status": "success"}

@router.put("/read-all")
def mark_all_notifications_read(db: Session = Depends(get_sync_db)):
    db.query(Notification).filter(Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"status": "success"}
