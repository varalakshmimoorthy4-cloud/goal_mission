"""Goal Mission - Flask application factory and entry point.

Run (from the backend folder):  python app.py
"""
import logging
import os

from flask import Flask, jsonify
from flask_cors import CORS
from werkzeug.exceptions import HTTPException

from config import Config, load_secret_key
from extensions import db
from services.claude_service import ClaudeService
from utils.http import api_error
from utils.ratelimit import RateLimiter


def create_app(config_object=None):
    app = Flask(__name__)
    app.config.from_object(config_object or Config)
    if not app.config.get("SECRET_KEY"):
        app.config["SECRET_KEY"] = load_secret_key()

    logging.basicConfig(level=logging.INFO)
    db.init_app(app)
    # Only the configured frontend origins may call the API from a browser.
    CORS(app, resources={r"/api/*": {"origins": app.config["FRONTEND_ORIGINS"]}})

    # Per-app singletons: AI service and in-memory rate limiters.
    app.extensions["claude_service"] = ClaudeService.from_config(app.config)
    app.extensions["gm_limiters"] = {
        "login": RateLimiter(max_calls=8, window_seconds=300),   # failed logins
        "ai": RateLimiter(max_calls=30, window_seconds=600),     # AI calls per user
        "demo": RateLimiter(max_calls=10, window_seconds=600),   # demo sessions per IP
    }

    from routes import ALL_BLUEPRINTS

    for blueprint in ALL_BLUEPRINTS:
        app.register_blueprint(blueprint)

    @app.get("/api/health")
    def health():
        return jsonify({"status": "ok"})

    _register_error_handlers(app)

    # Automatic database initialisation: creates any missing tables on start-up.
    import models  # noqa: F401  (registers all models)

    with app.app_context():
        db.create_all()
    return app


def _register_error_handlers(app):
    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        return api_error(error.description or error.name, error.code or 500, error.name.lower().replace(" ", "_"))

    @app.errorhandler(Exception)
    def handle_unexpected(error):
        db.session.rollback()
        app.logger.exception("Unhandled error: %s", error)
        return api_error("Something went wrong on the server.", 500, "server_error")


if __name__ == "__main__":
    application = create_app()
    application.run(
        host="127.0.0.1",
        port=int(os.getenv("PORT", "5000")),
        debug=os.getenv("FLASK_DEBUG", "1") == "1",
    )
