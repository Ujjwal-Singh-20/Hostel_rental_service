import os
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "HostelShare"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = ""

    # JWT Authentication
    JWT_SECRET: str = "dev_super_secret_hostelshare_jwt_key_98234710923"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Mock OTP for development/testing
    DEV_MOCK_OTP: str = "123456"

    # CORS
    ALLOWED_ORIGINS: str = "*"

    # Supabase Storage Configuration
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_BUCKET: str = "hostelshare-media"

    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    @property
    def cors_origins(self) -> List[str]:
        if not self.ALLOWED_ORIGINS or self.ALLOWED_ORIGINS.strip() == "*":
            return ["*"]
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

    @property
    def effective_database_url(self) -> str:
        if self.DATABASE_URL and self.DATABASE_URL.strip():
            url = self.DATABASE_URL.strip()
            # Standardize postgres:// to postgresql+psycopg2:// if needed
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+psycopg2://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+psycopg2://"):
                url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
            return url
        # Fallback to local SQLite for immediate execution if Supabase isn't configured yet
        return "sqlite:///./hostelshare.db"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
