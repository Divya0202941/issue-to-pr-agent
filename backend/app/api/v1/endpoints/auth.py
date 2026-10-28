from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SyncSessionLocal
from app.db.models import User, GitHubConnection, UserPreference
from app.schemas import UserRead
from app.core.security import mask_secret
from app.services.github_service import github_service, sanitize_github_token

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
    
    active_token = github_service.token
    has_token = bool(active_token)
    
    is_connected = False
    display_username = None
    token_preview = None
    scopes = None
    
    if gh_conn and gh_conn.is_active and gh_conn.encrypted_token:
        is_connected = True
        display_username = gh_conn.github_username
        token_preview = mask_secret(gh_conn.encrypted_token)
        scopes = gh_conn.scopes
    elif has_token:
        is_connected = True
        token_type = "Fine-grained PAT" if active_token.startswith("github_pat_") else ("Classic PAT" if active_token.startswith("ghp_") else "PAT")
        display_username = gh_conn.github_username if (gh_conn and gh_conn.github_username and gh_conn.github_username != "alexmercer-dev") else "Render Environment"
        token_preview = mask_secret(active_token)
        scopes = f"{token_type} (env)"
    
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "github_connection": {
            "is_connected": is_connected,
            "github_username": display_username,
            "token_preview": token_preview,
            "scopes": scopes,
        } if is_connected else None,
        "preferences": {
            "theme": pref.theme if pref else "dark",
            "notify_on_complete": pref.notify_on_complete if pref else True,
            "notify_on_failure": pref.notify_on_failure if pref else True,
            "notify_on_approval": pref.notify_on_approval if pref else True,
            "ai_provider": pref.ai_provider if pref else "mock",
        } if pref else None
    }

@router.get("/verify-token")
async def verify_github_token():
    """Diagnostic endpoint to verify whether the configured token works against GitHub API."""
    return await github_service.verify_token()

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
        
    clean_token = sanitize_github_token(token)
    gh_conn.github_username = username
    gh_conn.encrypted_token = clean_token
    gh_conn.token_preview = mask_secret(clean_token) if clean_token else None
    gh_conn.scopes = "repo, read:user, workflow"
    gh_conn.is_active = bool(clean_token)
    db.commit()
    
    return {"status": "connected", "username": username, "token_preview": gh_conn.token_preview}

@router.post("/disconnect-github")
def disconnect_github(db: Session = Depends(get_sync_db)):
    user = db.query(User).first()
    if user and user.github_connection:
        user.github_connection.is_active = False
        user.github_connection.encrypted_token = None
        user.github_connection.token_preview = None
        db.commit()
    return {"status": "disconnected"}
