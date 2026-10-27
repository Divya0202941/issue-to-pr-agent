from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth, repositories, issues, agent_runs,
    code_review, pull_requests, activity, analytics,
    settings, notifications
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(repositories.router, prefix="/repositories", tags=["repositories"])
api_router.include_router(issues.router, prefix="/issues", tags=["issues"])
api_router.include_router(agent_runs.router, prefix="/agent-runs", tags=["agent-runs"])
api_router.include_router(code_review.router, prefix="/code-review", tags=["code-review"])
api_router.include_router(pull_requests.router, prefix="/pull-requests", tags=["pull-requests"])
api_router.include_router(activity.router, prefix="/activity", tags=["activity"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
