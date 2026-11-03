"""Blueprint registry."""
from routes.ai import ai_bp
from routes.auth import auth_bp
from routes.dashboard import dashboard_bp
from routes.goals import goals_bp
from routes.missions import missions_bp

ALL_BLUEPRINTS = (auth_bp, goals_bp, missions_bp, dashboard_bp, ai_bp)
