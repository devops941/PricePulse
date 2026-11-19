import os
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_ENV: str = "development"
    MONGODB_URI: str
    MONGODB_DB_NAME: str = "pricepulse"
    MONGODB_TEST_DB_NAME: str = "pricepulse_test"
    JWT_SECRET: str
    JWT_ACCESS_MINUTES: int = 30
    JWT_REFRESH_DAYS: int = 7
    CORS_ORIGINS: str = "http://localhost:5173"
    UPLOAD_MAX_MB: int = 10
    DEMO_USER_PASSWORD: str = "PricePulse@Demo2026!"
    LOG_LEVEL: str = "INFO"
    TESTING: bool = False
    USE_MOCK_DB: bool = False

    @field_validator("MONGODB_URI")
    @classmethod
    def validate_mongodb_uri(cls, v: str) -> str:
        if not v or v.strip() == "":
            raise ValueError("MONGODB_URI is required and cannot be empty.")
        val = v.strip()
        if (
            "<paste-your-atlas-uri-here-locally-only>" in val
            or val.startswith("<")
            or "your-atlas-uri" in val.lower()
            or val.lower() in ("placeholder", "none", "null")
        ):
            raise ValueError("MONGODB_URI is still a placeholder. Please provide a valid MongoDB connection string.")
        return val

    @field_validator("JWT_SECRET")
    @classmethod
    def validate_jwt_secret(cls, v: str) -> str:
        if not v or v.strip() == "":
            raise ValueError("JWT_SECRET is required and cannot be empty.")
        val = v.strip()
        if (
            "<generate-a-long-random-string>" in val
            or val.startswith("<")
            or "long-random-string" in val.lower()
            or val.lower() in ("placeholder", "secret", "changeme")
            or len(val) < 16
        ):
            raise ValueError("JWT_SECRET is still a placeholder or too short (minimum 16 chars).")
        return val

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


_settings_instance = None

def get_settings() -> Settings:
    global _settings_instance
    if _settings_instance is None:
        _settings_instance = Settings()
    return _settings_instance
