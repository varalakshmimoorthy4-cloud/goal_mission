"""Goal model. Progress is always derived from the goal's missions."""
from datetime import date

from extensions import db
from models.mixins import TimestampMixin, iso


class Goal(TimestampMixin, db.Model):
    __tablename__ = "goals"
    __table_args__ = (
        db.CheckConstraint("priority IN ('low', 'medium', 'high')", name="ck_goals_priority"),
        db.CheckConstraint("status IN ('active', 'completed')", name="ck_goals_status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False, default="")
    category = db.Column(db.String(40), nullable=False, default="Other")
    priority = db.Column(db.String(10), nullable=False, default="medium")
    status = db.Column(db.String(10), nullable=False, default="active")
    target_date = db.Column(db.Date, nullable=True)
    completed_at = db.Column(db.DateTime, nullable=True)

    user = db.relationship("User", back_populates="goals")
    missions = db.relationship(
        "Mission", back_populates="goal", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def is_overdue(self) -> bool:
        return bool(
            self.status == "active" and self.target_date and self.target_date < date.today()
        )

    def progress(self) -> dict:
        """Progress summary calculated from missions.

        percentage = completed missions / total missions.
        A goal with no missions is 0% (or 100% if the user marked it completed).
        """
        total = len(self.missions)
        completed = sum(1 for m in self.missions if m.status == "completed")
        overdue = sum(1 for m in self.missions if m.is_overdue)
        if total:
            percentage = round(completed / total * 100)
        else:
            percentage = 100 if self.status == "completed" else 0
        return {
            "total_missions": total,
            "completed_missions": completed,
            "pending_missions": total - completed,
            "overdue_missions": overdue,
            "percentage": percentage,
        }

    def to_dict(self, include_missions: bool = False) -> dict:
        days_left = (self.target_date - date.today()).days if self.target_date else None
        data = {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "category": self.category,
            "priority": self.priority,
            "status": self.status,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "days_until_target": days_left,
            "is_overdue": self.is_overdue,
            "completed_at": iso(self.completed_at),
            "created_at": iso(self.created_at),
            "updated_at": iso(self.updated_at),
            "progress": self.progress(),
        }
        if include_missions:
            data["missions"] = [m.to_dict() for m in self.missions]
        return data
