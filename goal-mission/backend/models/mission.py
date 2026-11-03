"""Mission model: a small, concrete step that belongs to a goal."""
from datetime import date

from extensions import db
from models.mixins import TimestampMixin, iso


class Mission(TimestampMixin, db.Model):
    __tablename__ = "missions"
    __table_args__ = (
        db.CheckConstraint("priority IN ('low', 'medium', 'high')", name="ck_missions_priority"),
        db.CheckConstraint("status IN ('pending', 'completed')", name="ck_missions_status"),
        db.CheckConstraint(
            "estimated_minutes IS NULL OR estimated_minutes > 0", name="ck_missions_minutes"
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    goal_id = db.Column(db.Integer, db.ForeignKey("goals.id"), nullable=False, index=True)
    # user_id is stored too so every query can be filtered by owner directly.
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    priority = db.Column(db.String(10), nullable=False, default="medium")
    status = db.Column(db.String(10), nullable=False, default="pending")
    due_date = db.Column(db.Date, nullable=True)
    estimated_minutes = db.Column(db.Integer, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)
    # True when the mission was created from an AI-generated plan (kept for transparency).
    ai_generated = db.Column(db.Boolean, nullable=False, default=False)

    goal = db.relationship("Goal", back_populates="missions")

    @property
    def is_overdue(self) -> bool:
        return bool(self.status == "pending" and self.due_date and self.due_date < date.today())

    def set_status(self, status: str) -> None:
        """Change status and keep completed_at consistent."""
        from models.mixins import utcnow

        if status == "completed" and self.status != "completed":
            self.completed_at = utcnow()
        elif status == "pending":
            self.completed_at = None
        self.status = status

    def to_dict(self) -> dict:
        days_left = (self.due_date - date.today()).days if self.due_date else None
        return {
            "id": self.id,
            "goal_id": self.goal_id,
            "goal_title": self.goal.title if self.goal else None,
            "title": self.title,
            "description": self.description,
            "priority": self.priority,
            "status": self.status,
            "due_date": self.due_date.isoformat() if self.due_date else None,
            "days_until_due": days_left,
            "is_overdue": self.is_overdue,
            "estimated_minutes": self.estimated_minutes,
            "ai_generated": self.ai_generated,
            "completed_at": iso(self.completed_at),
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
        }
