import os
from typing import Optional, Union
from urllib.parse import urlsplit
from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic import SecretStr
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """TerraGuardian API settings.

    All values are loaded from environment variables.
    See .env.example for the full list.
    """

    environment: str = Field(
        default="development",
        validation_alias=AliasChoices("ENVIRONMENT", "TERRAGUARDIAN_ENV", "VERCEL_ENV"),
    )
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

    @field_validator("database_url", mode="before")
    @classmethod
    def assemble_database_url(cls, v: Optional[str]) -> str:
        env_db = os.environ.get("DATABASE_URL")
        if env_db and env_db.strip():
            return env_db.strip()
        if v and v.strip():
            return v.strip()
        return "sqlite+aiosqlite:///./terraguardian.db"

    # Security
    secret_key: str = "changeme-generate-a-real-key"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60
    demo_auth_enabled: bool = False
    demo_operator_password: Optional[SecretStr] = None
    demo_assessment_password: Optional[SecretStr] = None
    demo_patrol_password: Optional[SecretStr] = None
    demo_magistrate_password: Optional[SecretStr] = None
    demo_reviewer_password: Optional[SecretStr] = None

    # Object Storage (S3 / R2 / GCS / Supabase)
    storage_provider: str = "local"
    s3_bucket_name: Optional[str] = None
    s3_endpoint_url: Optional[str] = None
    s3_region_name: str = "ap-south-1"
    s3_access_key_id: Optional[str] = None
    s3_secret_access_key: Optional[str] = None
    storage_public_base_url: Optional[str] = None

    @model_validator(mode="after")
    def validate_production_dependencies(self) -> "Settings":
        if self.environment.strip().lower() != "production":
            return self

        self.cors_origins = [
            origin
            for origin in self.cors_origins
            if urlsplit(origin).hostname not in {"localhost", "127.0.0.1", "::1"}
        ]

        if not self.database_url.startswith((
            "postgresql+asyncpg://",
            "postgresql://",
            "postgres://",
        )):
            raise RuntimeError("Production requires DATABASE_URL for persistent PostgreSQL storage.")

        if len(self.secret_key.strip()) < 32 or self.secret_key == "changeme-generate-a-real-key":
            raise RuntimeError("Production requires a non-default SECRET_KEY of at least 32 characters.")

        if self.storage_provider.strip().lower() not in {"s3", "cloud", "production", "object_storage"}:
            raise RuntimeError("Production requires a durable S3-compatible STORAGE_PROVIDER.")
        if not self.s3_bucket_name or not self.s3_access_key_id or not self.s3_secret_access_key:
            raise RuntimeError("Production object storage requires S3_BUCKET_NAME and S3 credentials.")

        if self.demo_auth_enabled and any(
            password is None
            for password in (
                self.demo_operator_password,
                self.demo_assessment_password,
                self.demo_patrol_password,
                self.demo_magistrate_password,
                self.demo_reviewer_password,
            )
        ):
            raise RuntimeError("Enabled production demo authentication requires all five server-side demo credentials.")

        return self

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
