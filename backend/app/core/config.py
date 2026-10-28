import os
from typing import List, Optional
from pydantic import BaseModel, Field

BACKEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEFAULT_DB_FILE = os.path.join(BACKEND_DIR, "issue_to_pr.db").replace("\\", "/")

class Settings(BaseModel):
    PROJECT_NAME: str = "Issue to PR Agent"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = Field(default_factory=lambda: os.getenv("ENVIRONMENT", "development"))
    DEBUG: bool = Field(default_factory=lambda: os.getenv("DEBUG", "true").lower() == "true")
    
    # Database
    DATABASE_URL: str = Field(default_factory=lambda: os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{DEFAULT_DB_FILE}"))
    SYNC_DATABASE_URL: str = Field(default_factory=lambda: os.getenv("SYNC_DATABASE_URL", f"sqlite:///{DEFAULT_DB_FILE}"))
    
    # Security
    SECRET_KEY: str = Field(default_factory=lambda: os.getenv("SECRET_KEY", "development_secret_key_change_in_production_32_chars_min"))
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "https://issue-to-pr-agent.vercel.app,http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8000,http://127.0.0.1:8000"
            ).split(",")
            if origin.strip()
        ]
    )
    
    # GitHub Integration
    GITHUB_TOKEN: Optional[str] = Field(
        default_factory=lambda: (
            os.getenv("GITHUB_TOKEN") or
            os.getenv("GH_TOKEN") or
            os.getenv("GITHUB_PAT")
        )
    )
    GITHUB_CLIENT_ID: Optional[str] = Field(default_factory=lambda: os.getenv("GITHUB_CLIENT_ID"))
    GITHUB_CLIENT_SECRET: Optional[str] = Field(default_factory=lambda: os.getenv("GITHUB_CLIENT_SECRET"))
    GITHUB_API_BASE: str = "https://api.github.com"
    
    # AI Providers
    AI_PROVIDER: str = Field(default_factory=lambda: os.getenv("AI_PROVIDER", "mock"))
    OPENAI_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("OPENAI_API_KEY"))
    OPENAI_MODEL: str = Field(default_factory=lambda: os.getenv("OPENAI_MODEL", "gpt-4o"))
    ANTHROPIC_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("ANTHROPIC_API_KEY"))
    ANTHROPIC_MODEL: str = Field(default_factory=lambda: os.getenv("ANTHROPIC_MODEL", "claude-3-5-sonnet-20241022"))
    GEMINI_API_KEY: Optional[str] = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY"))
    GEMINI_MODEL: str = Field(default_factory=lambda: os.getenv("GEMINI_MODEL", "gemini-1.5-pro"))
    
    # Sandbox & Execution Limits
    SANDBOX_TIMEOUT_SECONDS: int = 60
    MAX_CORRECTION_ATTEMPTS: int = 3
    MAX_FILE_SIZE_BYTES: int = 500_000  # 500KB
    DEMO_MODE_DEFAULT: bool = True

settings = Settings()
