"""Sample data used by Demo Mode and the seed script.

Every sample goal description starts with "[Sample data]" so it is always
obvious that the content is not real.
"""
from datetime import date, timedelta

from extensions import db
from models import Goal, Mission
from models.mixins import utcnow

SAMPLE_TAG = "[Sample data] "


def populate_demo_data(user) -> None:
    """Create sample goals and missions for `user` (dates are relative to today)."""
    today = date.today()
    now = utcnow()

    def day(offset: int) -> date:
        return today + timedelta(days=offset)

    # (title, description, category, priority, status, target offset, missions)
    # mission tuple: (title, priority, due offset, minutes, completed_days_ago or None)
    specs = [
        (
            "Learn Python Programming",
            "Learn the basics of Python and build a small project.",
            "Learning", "high", "active", 30,
            [
                ("Install Python and set up VS Code", "low", -18, 30, 20),
                ("Finish the variables, loops and functions tutorials", "high", -8, 240, 9),
                ("Build a command-line to-do list", "high", 7, 180, None),
                ("Solve 20 beginner coding problems", "medium", 14, 300, None),
                ("Build a small Flask web app", "medium", 26, 360, None),
            ],
        ),
        (
            "Database Systems Assignment",
            "Design a database and write the report for the DBMS course.",
            "Academic", "high", "active", 6,
            [
                ("Read the assignment brief", "low", -6, 20, 6),
                ("Draw the ER diagram", "high", -3, 90, 3),
                ("Collect sample datasets", "medium", -2, 45, None),
                ("Write the SQL queries", "high", 2, 120, None),
                ("Write the report", "high", 5, 180, None),
                ("Proofread and submit", "medium", 6, 45, None),
            ],
        ),
        (
            "Build a Daily Fitness Habit",
            "Move a little every day and build a sustainable routine.",
            "Fitness", "medium", "active", 45,
            [
                ("Plan a weekly workout schedule", "medium", -5, 30, 1),
                ("Walk 30 minutes every day for a week", "medium", 4, 210, None),
                ("Track meals for two weeks", "low", 14, 100, None),
                ("Complete a first 5K run or walk", "high", 40, 60, None),
            ],
        ),
        (
            "Update My Resume",
            "Refresh the resume and LinkedIn profile.",
            "Career", "low", "completed", -2,
            [
                ("Collect recent achievements", "medium", -12, 40, 11),
                ("Rewrite the resume", "high", -8, 90, 7),
                ("Update the LinkedIn profile", "low", -5, 45, 4),
            ],
        ),
    ]

    for title, description, category, priority, status, target_offset, missions in specs:
        goal = Goal(
            user_id=user.id,
            title=title,
            description=SAMPLE_TAG + description,
            category=category,
            priority=priority,
            status=status,
            target_date=day(target_offset),
            created_at=now - timedelta(days=21),
        )
        if status == "completed":
            goal.completed_at = now - timedelta(days=3)
        db.session.add(goal)
        db.session.flush()  # get goal.id

        for m_title, m_priority, due_offset, minutes, done_days_ago in missions:
            mission = Mission(
                goal_id=goal.id,
                user_id=user.id,
                title=m_title,
                description="",
                priority=m_priority,
                due_date=day(due_offset),
                estimated_minutes=minutes,
                status="pending",
                created_at=now - timedelta(days=21),
            )
            if done_days_ago is not None:
                mission.status = "completed"
                mission.completed_at = now - timedelta(days=done_days_ago, hours=2)
            db.session.add(mission)
    db.session.commit()
