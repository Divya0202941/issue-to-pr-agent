import os
os.environ["DISABLE_SQLALCHEMY_CEXT"] = "1"

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.init_db import init_database
from app.db.seed_data import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed data on startup
    init_database()
    seed_database()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Issue to PR Agent - An Autonomous AI Engineering Platform: From GitHub Issue to Pull Request, Automatically.",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permits local development and demo access
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API v1 router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health", tags=["system"])
@app.get(f"{settings.API_V1_STR}/health", tags=["system"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "connected",
        "ai_provider": settings.AI_PROVIDER
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
