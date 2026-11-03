"""Small helpers shared by all models."""
from datetime import datetime, timezone

from extensions import db


def utcnow() -> datetime:
    """Current UTC time as a naive datetime (SQLite stores naive datetimes)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def iso(value):
    """Serialise a naive-UTC datetime as an ISO string ending in 'Z'."""
    return value.isoformat() + "Z" if value else None


class TimestampMixin:
    """Adds created_at / updated_at columns that maintain themselves."""

    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)
    updated_at = db.Column(db.DateTime, nullable=False, default=utcnow, onupdate=utcnow)
