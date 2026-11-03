"""User model with secure password hashing and productivity preferences."""
from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db
from models.mixins import TimestampMixin, iso


class User(TimestampMixin, db.Model):
    __tablename__ = "users"
    __table_args__ = (
        db.CheckConstraint("daily_focus_minutes BETWEEN 15 AND 960", name="ck_users_focus"),
        db.CheckConstraint("reminder_days BETWEEN 0 AND 30", name="ck_users_reminder"),
        db.CheckConstraint("weekly_mission_target BETWEEN 1 AND 100", name="ck_users_target"),
    )

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(80), nullable=False)
    email = db.Column(db.String(254), nullable=False, unique=True, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    is_demo = db.Column(db.Boolean, nullable=False, default=False)

    # Basic productivity preferences (editable on the Profile page)
    daily_focus_minutes = db.Column(db.Integer, nullable=False, default=60)
    reminder_days = db.Column(db.Integer, nullable=False, default=3)
    weekly_mission_target = db.Column(db.Integer, nullable=False, default=5)

    goals = db.relationship(
        "Goal", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )
    chat_messages = db.relationship(
        "ChatMessage", back_populates="user", cascade="all, delete-orphan", lazy="dynamic"
    )

    def set_password(self, password: str) -> None:
        # werkzeug uses a salted, slow hash (scrypt/pbkdf2) - never store plain text.
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self) -> dict:
        """Public representation - never includes the password hash."""
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "is_demo": self.is_demo,
            "preferences": {
                "daily_focus_minutes": self.daily_focus_minutes,
                "reminder_days": self.reminder_days,
                "weekly_mission_target": self.weekly_mission_target,
            },
            "created_at": iso(self.created_at),
        }
