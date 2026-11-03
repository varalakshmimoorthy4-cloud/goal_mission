"""Application configuration, loaded from environment variables (.env supported)."""
import os
import secrets
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent

# Load goal-mission/.env first, then an optional backend/.env.
load_dotenv(PROJECT_ROOT / ".env")
load_dotenv(BASE_DIR / ".env")

SECRET_PLACEHOLDER = "change-me-to-a-long-random-string"
API_KEY_PLACEHOLDER_PREFIX = "your-"


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _env_number(name: str, default, cast):
    try:
        return cast(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def load_secret_key() -> str:
    """Return the signing key.

    Uses SECRET_KEY from the environment when it is set to a real value.
    Otherwise generates a random key once and stores it in backend/instance so
    that logins survive server restarts during local development.
    """
    key = os.getenv("SECRET_KEY", "").strip()
    if key and key != SECRET_PLACEHOLDER:
        return key
    instance_dir = BASE_DIR / "instance"
    instance_dir.mkdir(exist_ok=True)
    key_file = instance_dir / "secret_key.txt"
    if key_file.exists():
        stored = key_file.read_text(encoding="utf-8").strip()
        if stored:
            return stored
    generated = secrets.token_hex(32)
    key_file.write_text(generated, encoding="utf-8")
    return generated


def _clean_api_key():
    key = (os.getenv("ANTHROPIC_API_KEY") or "").strip()
    if not key or key.startswith(API_KEY_PLACEHOLDER_PREFIX):
        return None  # placeholder from .env.example means "no key"
    return key


class Config:
    SQLALCHEMY_DATABASE_URI = (
        os.getenv("DATABASE_URL") or f"sqlite:///{(BASE_DIR / 'goal_mission.db').as_posix()}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    ANTHROPIC_API_KEY = _clean_api_key()
    CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5")
    CLAUDE_MAX_TOKENS = _env_number("CLAUDE_MAX_TOKENS", 2500, int)
    CLAUDE_TIMEOUT_SECONDS = _env_number("CLAUDE_TIMEOUT_SECONDS", 45.0, float)

    FRONTEND_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
        ).split(",")
        if origin.strip()
    ]
    TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60  # login tokens last 7 days
    ENABLE_DEMO_MODE = _env_bool("ENABLE_DEMO_MODE", True)


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret-key"
    ANTHROPIC_API_KEY = None
    ENABLE_DEMO_MODE = True
