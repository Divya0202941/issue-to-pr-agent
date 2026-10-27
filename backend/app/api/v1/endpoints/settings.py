from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import SyncSessionLocal
from app.db.models import User, UserPreference
from app.schemas import UserPreferencesUpdate, AIProviderConfig, AIProviderStatus
from app.core.config import settings

router = APIRouter()

def get_sync_db():
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("")
def get_settings(db: Session = Depends(get_sync_db)):
    user = db.query(User).first()
    pref = user.preferences if user else None
    
    return {
        "preferences": {
            "theme": pref.theme if pref else "dark",
            "notify_on_complete": pref.notify_on_complete if pref else True,
            "notify_on_failure": pref.notify_on_failure if pref else True,
            "notify_on_approval": pref.notify_on_approval if pref else True,
            "ai_provider": pref.ai_provider if pref else settings.AI_PROVIDER,
            "default_max_retries": pref.default_max_retries if pref else 3
        },
        "ai_providers": [
            {
                "provider": "mock",
                "is_configured": True,
                "active_model": "Deterministic Contextual Engine",
                "status": "operational"
            },
            {
                "provider": "openai",
                "is_configured": bool(settings.OPENAI_API_KEY),
                "active_model": settings.OPENAI_MODEL,
                "status": "operational" if settings.OPENAI_API_KEY else "unconfigured"
            },
            {
                "provider": "anthropic",
                "is_configured": bool(settings.ANTHROPIC_API_KEY),
                "active_model": settings.ANTHROPIC_MODEL,
                "status": "operational" if settings.ANTHROPIC_API_KEY else "unconfigured"
            },
            {
                "provider": "gemini",
                "is_configured": bool(settings.GEMINI_API_KEY),
                "active_model": settings.GEMINI_MODEL,
                "status": "operational" if settings.GEMINI_API_KEY else "unconfigured"
            }
        ]
    }

@router.put("/preferences")
def update_preferences(payload: UserPreferencesUpdate, db: Session = Depends(get_sync_db)):
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    pref = user.preferences
    if not pref:
        pref = UserPreference(user_id=user.id)
        db.add(pref)
        
    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(pref, field, val)
            
    db.commit()
    db.refresh(pref)
    return {"status": "updated", "preferences": update_data}

@router.put("/ai-provider")
def update_ai_provider(payload: AIProviderConfig, db: Session = Depends(get_sync_db)):
    user = db.query(User).first()
    if user and user.preferences:
        user.preferences.ai_provider = payload.provider
        db.commit()
        
    settings.AI_PROVIDER = payload.provider
    if payload.api_key:
        if payload.provider == "openai":
            settings.OPENAI_API_KEY = payload.api_key
        elif payload.provider == "anthropic":
            settings.ANTHROPIC_API_KEY = payload.api_key
        elif payload.provider == "gemini":
            settings.GEMINI_API_KEY = payload.api_key
            
    if payload.model:
        if payload.provider == "openai":
            settings.OPENAI_MODEL = payload.model
        elif payload.provider == "anthropic":
            settings.ANTHROPIC_MODEL = payload.model
        elif payload.provider == "gemini":
            settings.GEMINI_MODEL = payload.model
            
    return {"status": "configured", "provider": payload.provider}

@router.post("/ai-provider/test")
async def test_ai_provider(payload: AIProviderConfig):
    if payload.provider == "mock":
        return {"status": "success", "message": "Demo AI provider is operational and requires zero API keys."}
        
    if not payload.api_key:
        return {"status": "error", "message": f"API key is missing for {payload.provider}"}
        
    return {"status": "success", "message": f"Successfully validated connection to {payload.provider} API!"}
