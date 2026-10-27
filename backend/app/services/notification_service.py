from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.db.models import Notification, User

class NotificationService:
    @staticmethod
    def create_notification(
        db: Session,
        title: str,
        message: str,
        type: str = "info",
        link: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Notification:
        """Creates an in-app notification for the user."""
        if not user_id:
            # Attach to default or first user if available
            user = db.query(User).first()
            user_id = user.id if user else None
            
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type,
            link=link,
            is_read=False,
            created_at=datetime.utcnow()
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

notification_service = NotificationService()
