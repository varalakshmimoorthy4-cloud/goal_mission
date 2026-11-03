"""Create a sample-data account for demonstrations.

Usage (from the backend folder, with the virtual environment active):
    python scripts/seed_demo_data.py
    python scripts/seed_demo_data.py --email me@example.com --password "MyPass123"

If --password is omitted a random one is generated and printed once.
Nothing is created unless you run this script - there is no hidden default account.
"""
import argparse
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402
from models import User  # noqa: E402
from services.demo_data import populate_demo_data  # noqa: E402
from utils.validators import password_problem  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed a Goal Mission sample account.")
    parser.add_argument("--email", default="sample.user@example.com")
    parser.add_argument("--name", default="Sample User")
    parser.add_argument("--password", default=None)
    args = parser.parse_args()

    password = args.password or (secrets.token_urlsafe(9) + "a1")
    problem = password_problem(password)
    if problem:
        print(f"Error: {problem}")
        return 1

    app = create_app()
    with app.app_context():
        email = args.email.strip().lower()
        if User.query.filter_by(email=email).first():
            print(f"Error: a user with email {email} already exists. Choose another --email.")
            return 1
        user = User(name=args.name, email=email, is_demo=True)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()
        populate_demo_data(user)

    print("Sample account created (all goals are labelled '[Sample data]').")
    print(f"  Email:    {email}")
    print(f"  Password: {password}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
