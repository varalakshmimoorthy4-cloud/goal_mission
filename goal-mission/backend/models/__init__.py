"""Import every model so SQLAlchemy registers all tables."""
from models.chat import ChatMessage
from models.goal import Goal
from models.mission import Mission
from models.user import User

__all__ = ["User", "Goal", "Mission", "ChatMessage"]
