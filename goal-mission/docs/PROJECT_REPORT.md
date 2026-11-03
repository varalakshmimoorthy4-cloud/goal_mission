# Goal Mission - Project Report

**Project title:** Goal Mission - AI-Powered Goal Setting and Mission Tracking System
**Type:** Full-stack web application (college project)

## Abstract
Goal Mission is a web application that helps users convert ambitious goals into small, dated missions and
track their completion. A generative-AI planner (Claude) drafts an action plan from the user's goal, weekly
availability, skill level and deadline; the user reviews and edits it before saving. A chat assistant provides
motivation and productivity coaching. The system provides dashboards, deadline calendars and in-app reminders,
and protects each user's data with authentication and per-user authorisation. The application also works without
an AI key by using clearly labelled non-AI fallbacks.

## 1. Introduction
Goal setting is effective only when goals are specific, measurable and time-bound. Most people struggle to
decompose goals and to stay consistent. Goal Mission addresses this by combining task tracking with AI-assisted planning.

## 2. Problem statement
Users lack a simple tool that (a) helps them break a goal into achievable steps, (b) shows progress and
deadlines, and (c) offers guidance when motivation drops. Generic to-do apps do not plan, and AI chatbots do not
track progress.

## 3. Objectives
1. Provide secure registration and login with private user data.
2. Support goals and missions with priorities, deadlines and status.
3. Calculate progress automatically from mission completion.
4. Integrate Claude to generate editable plans and motivational chat.
5. Visualise progress and deadlines through charts and a calendar.
6. Degrade gracefully and honestly when the AI is unavailable.

## 4. Scope
In scope: web UI, REST API, SQLite storage, Claude integration, tests and documentation.
Out of scope: email/SMS/push notifications, team collaboration, mobile apps, production hosting.

## 5. System requirements
- **Functional:** authentication, dashboard, goal CRUD, mission CRUD, AI planner, AI chat, progress tracking,
  calendar and reminders, profile and settings, demo mode.
- **Non-functional:** security (hashing, token expiry, ownership checks, validation, rate limiting), usability
  (responsive layout, accessible forms, empty states, notifications), reliability (consistent errors, AI fallback),
  maintainability (modular layers, tests), privacy (API key only on the server).
- **Software:** Python 3.10+, Node 18+, a modern browser. **Hardware:** any computer able to run them.

## 6. System design
### 6.1 Architecture
Three tiers: React single-page application -> Flask REST API (routes, validators, services) -> SQLite database,
plus an external Anthropic API reached only from the backend service layer (see README section 5).

### 6.2 Modules
| Module | Responsibility |
|---|---|
| Auth | Registration, login, signed tokens, profile, password change, demo accounts |
| Goals | Goal CRUD, filtering, completion, progress summary |
| Missions | Mission CRUD, sorting, overdue logic, bulk save of AI plans |
| Dashboard | Aggregated statistics, weekly chart data, upcoming deadlines, activity feed |
| AI service | Prompt construction, API calls, JSON extraction and validation, caching, fallbacks |
| Chat | Conversation storage and AI/fallback replies |

### 6.3 Data design
Tables `users`, `goals`, `missions`, `chat_messages` with foreign keys, check constraints and timestamps (see DATABASE_SCHEMA.md).

### 6.4 Main flows
- **Plan with AI:** user submits goal -> backend validates -> Claude returns JSON -> backend validates and clamps
  dates -> UI shows editable plan -> user saves -> goal and missions are created (bulk, all-or-nothing).
- **Progress:** toggling a mission updates its status and `completed_at`; goal progress is recomputed from missions on every read.

## 7. AI design
- Separate `claude_service.py`; the key comes from environment variables.
- The system prompt defines the required JSON schema and tells the model to treat user text as data.
- The response is parsed (tolerating code fences), then validated: titles required, minutes bounded, priorities
  whitelisted, due dates clamped between today and the deadline and kept in order.
- Errors handled: missing key, authentication, rate limit, timeout, connection, API status and invalid output.
- Cost control: 10 minute result cache, per-user rate limit, bounded token counts and short chat history.
- Transparency: AI content is labelled; fallback content is labelled as not AI; saved AI missions carry an "AI plan" badge.
- Safety: AI output is never executed or used to build SQL; the chat prompt advises seeking human support in distress.

## 8. Security
Salted password hashes; signed, expiring tokens bound to the password version; ownership filter on every query;
strict input validation; escaped LIKE searches; generic login error; failed-login throttling; CORS limited to
configured origins; no secrets in source control (`.env` ignored, `.env.example` has placeholders).

## 9. Implementation summary
Backend: Flask application factory with blueprints. Frontend: React with context providers for auth and toasts,
a typed-by-convention API client, route protection, and reusable components. Styling uses a purple/blue/white palette
with responsive breakpoints for desktop, tablet and mobile.

## 10. Testing
Automated pytest suites cover registration/login/profile/password/demo (`test_auth.py`), goal CRUD, filters,
progress and isolation (`test_goals.py`), mission CRUD, overdue, sorting and isolation (`test_missions.py`), AI
planning, fallback labelling, chat history and output validation (`test_ai.py`), and dashboard statistics
(`test_dashboard.py`). The Claude API is replaced by a fake service, so tests never make network calls.
Run with `python -m pytest` in `backend`. **Record your own results here after running the suite:**

| Test run | Date | Result |
|---|---|---|
| Backend pytest | _fill in_ | _fill in_ |
| Frontend build (`npm run build`) | _fill in_ | _fill in_ |
| Manual walkthrough of all 10 pages | _fill in_ | _fill in_ |

## 11. Limitations
Single-process in-memory rate limiting; SQLite and no migrations; reminders only inside the app; AI quality depends
on the model and prompt; tokens are stored in browser local storage (acceptable for a demo, use HTTP-only cookies for production).

## 12. Future scope
Notifications, recurring missions, collaboration, gamification, analytics, streaming AI responses, PostgreSQL, CI/CD.

## 13. Conclusion
Goal Mission shows how generative AI can be combined with conventional full-stack engineering to help users plan and
complete goals, while keeping the system secure, transparent about AI use, and usable without an AI key.

## 14. References
Flask, SQLAlchemy, React, Vite and Recharts documentation; Anthropic API documentation (docs.anthropic.com).
