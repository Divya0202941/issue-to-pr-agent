from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SyncSessionLocal
from app.db.models import User, GitHubConnection, UserPreference
from app.schemas import UserRead
from app.core.security import mask_secret

router = APIRouter()

def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/me")
def get_current_user(db: Session = Depends(get_sync_db)):
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    gh_conn = user.github_connection
    pref = user.preferences
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "github_connection": {
            "is_connected": gh_conn.is_active if gh_conn else False,
            "github_username": gh_conn.github_username if gh_conn else None,
            "token_preview": gh_conn.token_preview if gh_conn else None,
            "scopes": gh_conn.scopes if gh_conn else None,
        } if gh_conn else None,
        "preferences": {
            "theme": pref.theme if pref else "dark",
            "notify_on_complete": pref.notify_on_complete if pref else True,
            "notify_on_failure": pref.notify_on_failure if pref else True,
            "notify_on_approval": pref.notify_on_approval if pref else True,
            "ai_provider": pref.ai_provider if pref else "mock",
        } if pref else None
    }

@router.post("/connect-github")
def connect_github(payload: dict, db: Session = Depends(get_sync_db)):
    token = payload.get("token")
    username = payload.get("username", "github-user")
    
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    gh_conn = user.github_connection
    if not gh_conn:
        gh_conn = GitHubConnection(user_id=user.id)
        db.add(gh_conn)
        
    gh_conn.github_username = username
    gh_conn.encrypted_token = token
    gh_conn.token_preview = mask_secret(token)
    gh_conn.scopes = "repo, read:user, workflow"
    gh_conn.is_active = True
    db.commit()
    
    return {"status": "connected", "username": username, "token_preview": gh_conn.token_preview}

@router.post("/disconnect-github")
def disconnect_github(db: Session = Depends(get_sync_db)):
    user = db.query(User).first()
    if user and user.github_connection:
        user.github_connection.is_active = False
        db.commit()
    return {"status": "disconnected"}
