import os
from typing import Optional, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """TerraGuardian API settings.

    All values are loaded from environment variables.
    See .env.example for the full list.
    """

    environment: str = "development"
    log_level: str = "INFO"

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # CORS
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "https://terraguardian.vercel.app",
        "https://terraguardian-operations-centre.vercel.app",
        "https://terraguardian-safe.vercel.app",
    ]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, list[str]]) -> list[str]:
        # Check both API_CORS_ORIGINS and CORS_ORIGINS from env if provided
        env_cors = os.environ.get("API_CORS_ORIGINS") or os.environ.get("CORS_ORIGINS")
        if env_cors:
            v = env_cors
        if isinstance(v, str) and not v.startswith("["):
            origins = [i.strip() for i in v.split(",") if i.strip()]
            return origins
        elif isinstance(v, list):
            return v
        return [str(v)]

    # Database
    database_url: str = "sqlite+aiosqlite:///./terraguardian.db"

    # Security
    secret_key: str = "changeme-generate-a-real-key"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60

    # Object Storage (S3 / R2 / GCS / Supabase)
    storage_provider: str = "local"
    s3_bucket_name: Optional[str] = None
    s3_endpoint_url: Optional[str] = None
    s3_region_name: str = "ap-south-1"
    s3_access_key_id: Optional[str] = None
    s3_secret_access_key: Optional[str] = None
    storage_public_base_url: Optional[str] = None

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()

