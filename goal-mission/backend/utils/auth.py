"""Token-based authentication helpers.

Tokens are signed (not encrypted) with itsdangerous and expire after
TOKEN_MAX_AGE_SECONDS. They contain the user id plus a fingerprint of the
current password hash, so changing the password invalidates old tokens.
"""
import hashlib
from functools import wraps

from flask import current_app, g, request
from itsdangerous import BadSignature, URLSafeTimedSerializer

from extensions import db
from models import User
from utils.http import api_error


def _serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(current_app.config["SECRET_KEY"], salt="goal-mission-auth")


def _fingerprint(user: User) -> str:
    return hashlib.sha256(user.password_hash.encode("utf-8")).hexdigest()[:12]


def create_token(user: User) -> str:
    return _serializer().dumps({"uid": user.id, "pv": _fingerprint(user)})


def verify_token(token: str):
    """Return the User for a valid token, otherwise None."""
    try:
        payload = _serializer().loads(token, max_age=current_app.config["TOKEN_MAX_AGE_SECONDS"])
    except BadSignature:  # also covers expired signatures
        return None
    if not isinstance(payload, dict):
        return None
    user = db.session.get(User, payload.get("uid"))
    if user is None or payload.get("pv") != _fingerprint(user):
        return None
    return user


def require_auth(view):
    """Decorator: the request must carry 'Authorization: Bearer <token>'."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        header = request.headers.get("Authorization", "")
        scheme, _, token = header.partition(" ")
        if scheme.lower() != "bearer" or not token.strip():
            return api_error("Authentication required.", 401, "unauthorized")
        user = verify_token(token.strip())
        if user is None:
            return api_error("Your session is invalid or has expired. Please log in again.", 401, "unauthorized")
        g.current_user = user
        return view(*args, **kwargs)

    return wrapper
