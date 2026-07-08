from sqlalchemy.orm import Session
from backend.models.models import ActivityLog, Notification, User
from fastapi import Request
from typing import Optional

def log_activity(db: Session, user_id: Optional[int], action: str, description: str, ip_address: Optional[str] = None):
    log = ActivityLog(
        user_id=user_id,
        action=action,
        description=description,
        ip_address=ip_address
    )
    db.add(log)
    db.commit()

def create_notification(db: Session, user_id: int, message: str):
    notification = Notification(
        user_id=user_id,
        message=message,
        is_read=False
    )
    db.add(notification)
    db.commit()

def get_client_ip(request: Request) -> str:
    # Check for proxy headers first, then fallback to client host
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"
