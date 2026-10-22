from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "RailFood API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"

    # Environment & Host
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost",
    ]

    # JWT Security
    SECRET_KEY: str = "super-secret-key-change-in-production-min-32-chars-long"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # PostgreSQL Database (RDS Free Tier or Local Postgres)
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/railfood_db"

    # AWS S3 Configuration (Free Tier: 5GB Standard Storage)
    AWS_REGION: str = "ap-south-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    S3_BUCKET_NAME: str = "railfood-assets-bucket"
    S3_CUSTOM_DOMAIN: Optional[str] = None

    # AWS SES Configuration (Free Tier: 62,000 outbound emails/month if sent from EC2)
    SES_REGION: str = "ap-south-1"
    SES_SENDER_EMAIL: str = "no-reply@railfood.app"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )


settings = Settings()
