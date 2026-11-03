"""Chat history for the AI Motivation Assistant."""
from extensions import db
from models.mixins import iso, utcnow


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"
    __table_args__ = (
        db.CheckConstraint("role IN ('user', 'assistant')", name="ck_chat_role"),
        db.CheckConstraint("source IN ('user', 'claude', 'fallback')", name="ck_chat_source"),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    role = db.Column(db.String(10), nullable=False)
    content = db.Column(db.Text, nullable=False)
    # 'claude' = real AI reply, 'fallback' = pre-written non-AI message, 'user' = the person's text
    source = db.Column(db.String(10), nullable=False, default="user")
    created_at = db.Column(db.DateTime, nullable=False, default=utcnow)

    user = db.relationship("User", back_populates="chat_messages")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "source": self.source,
            "ai_generated": self.source == "claude",
            "created_at": iso(self.created_at),
        }
