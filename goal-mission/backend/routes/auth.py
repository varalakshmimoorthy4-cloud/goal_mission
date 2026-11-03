"""Authentication, demo mode and profile endpoints."""
import secrets
from datetime import timedelta

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy.exc import IntegrityError

from extensions import db
from models import User
from models.mixins import utcnow
from services.demo_data import populate_demo_data
from utils.auth import create_token, require_auth
from utils.http import api_error, invalid_json, json_body, validation_error
from utils.validators import (
    validate_login,
    validate_password_change,
    validate_profile_update,
    validate_registration,
)

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def _limiters():
    return current_app.extensions["gm_limiters"]


def _auth_response(user, status=200):
    return jsonify({"user": user.to_dict(), "token": create_token(user)}), status


@auth_bp.post("/register")
def register():
    data = json_body()
    if data is None:
        return invalid_json()
    clean, errors = validate_registration(data)
    if errors:
        return validation_error(errors)
    if User.query.filter_by(email=clean["email"]).first():
        return api_error(
            "An account with this email already exists.", 409, "email_taken",
            {"email": "This email is already registered."},
        )
    user = User(name=clean["name"], email=clean["email"])
    user.set_password(clean["password"])
    db.session.add(user)
    try:
        db.session.commit()
    except IntegrityError:  # two requests registering the same email at once
        db.session.rollback()
        return api_error("An account with this email already exists.", 409, "email_taken")
    return _auth_response(user, 201)


@auth_bp.post("/login")
def login():
    data = json_body()
    if data is None:
        return invalid_json()
    clean, errors = validate_login(data)
    if errors:
        return validation_error(errors)

    # Throttle repeated failures for the same email + IP (brute-force protection).
    key = f"{request.remote_addr}|{clean['email']}"
    limiter = _limiters()["login"]
    if limiter.is_blocked(key):
        return api_error("Too many failed attempts. Please wait a few minutes and try again.", 429, "rate_limited")

    user = User.query.filter_by(email=clean["email"]).first()
    if user is None or not user.check_password(clean["password"]):
        limiter.record(key)
        # Same message for unknown email and wrong password (no account enumeration).
        return api_error("Invalid email or password.", 401, "invalid_credentials")
    limiter.clear(key)
    return _auth_response(user)


@auth_bp.post("/logout")
@require_auth
def logout():
    # Tokens are stateless; the browser discards its copy. Nothing is stored server-side.
    return jsonify({"message": "Logged out."})


@auth_bp.post("/demo")
def start_demo():
    """Create a throw-away demo account filled with clearly labelled sample data."""
    if not current_app.config.get("ENABLE_DEMO_MODE", True):
        return api_error("Demo mode is disabled.", 404, "demo_disabled")
    if not _limiters()["demo"].hit(request.remote_addr or "unknown"):
        return api_error("Too many demo sessions started. Please try again later.", 429, "rate_limited")

    # Housekeeping: remove demo accounts older than 24 hours.
    cutoff = utcnow() - timedelta(hours=24)
    for old in User.query.filter(User.is_demo.is_(True), User.created_at < cutoff).all():
        db.session.delete(old)
    db.session.commit()

    suffix = secrets.token_hex(4)
    user = User(name="Demo User", email=f"demo-{suffix}@demo.goalmission.local", is_demo=True)
    user.set_password(secrets.token_urlsafe(24))  # random, never shown: demo uses a token only
    db.session.add(user)
    db.session.commit()
    populate_demo_data(user)
    return _auth_response(user, 201)


@auth_bp.get("/me")
@require_auth
def me():
    return jsonify({"user": g.current_user.to_dict()})


@auth_bp.put("/me")
@require_auth
def update_profile():
    data = json_body()
    if data is None:
        return invalid_json()
    clean, errors = validate_profile_update(data)
    if errors:
        return validation_error(errors)

    user = g.current_user
    if "email" in clean and clean["email"] != user.email:
        if User.query.filter(User.email == clean["email"], User.id != user.id).first():
            return api_error(
                "An account with this email already exists.", 409, "email_taken",
                {"email": "This email is already registered."},
            )
    for field, value in clean.items():
        setattr(user, field, value)  # keys match User column names
    try:
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        return api_error("An account with this email already exists.", 409, "email_taken")
    return jsonify({"user": user.to_dict()})


@auth_bp.put("/password")
@require_auth
def change_password():
    data = json_body()
    if data is None:
        return invalid_json()
    clean, errors = validate_password_change(data)
    if errors:
        return validation_error(errors)
    user = g.current_user
    if not user.check_password(clean["current_password"]):
        return api_error(
            "Current password is incorrect.", 400, "wrong_password",
            {"current_password": "Current password is incorrect."},
        )
    user.set_password(clean["new_password"])
    db.session.commit()
    # Old tokens stop working (they embed a password fingerprint); issue a fresh one.
    return jsonify({"message": "Password updated.", "token": create_token(user)})
