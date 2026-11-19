import pytest
from pydantic import ValidationError
from app.core.config import Settings
from app.core.logging import setup_logging, SensitiveFilter
import logging


def test_missing_or_placeholder_mongodb_uri():
    # Placeholder URI
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            MONGODB_URI="<paste-your-atlas-uri-here-locally-only>",
            JWT_SECRET="valid-long-secret-key-123456"
        )
    assert "MONGODB_URI is still a placeholder" in str(exc_info.value)

    # Empty URI
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            MONGODB_URI="",
            JWT_SECRET="valid-long-secret-key-123456"
        )
    assert "MONGODB_URI is required" in str(exc_info.value)


def test_missing_or_placeholder_jwt_secret():
    # Placeholder secret
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net",
            JWT_SECRET="<generate-a-long-random-string>"
        )
    assert "JWT_SECRET is still a placeholder" in str(exc_info.value)

    # Short secret
    with pytest.raises(ValidationError) as exc_info:
        Settings(
            MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net",
            JWT_SECRET="short"
        )
    assert "minimum 16 chars" in str(exc_info.value)


def test_valid_settings():
    s = Settings(
        MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/pricepulse",
        JWT_SECRET="super-secure-production-jwt-secret-key-2026",
        CORS_ORIGINS="http://localhost:5173, http://localhost:3000"
    )
    assert s.MONGODB_DB_NAME == "pricepulse"
    assert "http://localhost:5173" in s.cors_origins_list
    assert "http://localhost:3000" in s.cors_origins_list


def test_sensitive_filter_masks_credentials():
    logger = setup_logging("INFO")
    filter_obj = SensitiveFilter()
    
    # Check that record with mongo URI is sanitized
    record = logging.LogRecord(
        name="test",
        level=logging.INFO,
        pathname="",
        lineno=0,
        msg="Connecting to mongodb+srv://admin:mysecretpassword@atlas.mongodb.net/testdb with Bearer eyJhbGciOi...",
        args=(),
        exc_info=None
    )
    filter_obj.filter(record)
    assert "mysecretpassword" not in record.msg
    assert "mongodb://***:***@redacted" in record.msg
    assert "Bearer [REDACTED]" in record.msg
