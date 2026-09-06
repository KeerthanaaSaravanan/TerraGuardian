"""Application configuration via environment variables."""

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
    ]

    # Database
    database_url: str = "postgresql+asyncpg://terraguardian:changeme@localhost:5432/terraguardian"

    # Security
    secret_key: str = "changeme-generate-a-real-key"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
