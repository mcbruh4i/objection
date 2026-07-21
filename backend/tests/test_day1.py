from __future__ import annotations

from datetime import datetime
from pathlib import Path

from fastapi.testclient import TestClient

from app.database import connection_for, initialize_database
from app.main import create_app


def client_for(tmp_path: Path) -> TestClient:
    return TestClient(create_app(tmp_path / "day1.db"))


def test_seeded_today_uses_raw_deadline_and_integer_cents(tmp_path: Path) -> None:
    database_path = tmp_path / "day1.db"
    with TestClient(create_app(database_path)) as client:
        response = client.get("/today")
        assert response.status_code == 200
        habit = response.json()["habit"]
        assert habit == {
            "id": "habit-exercise-today",
            "title": "30 minutes of exercise",
            "minutes": 30,
            "deadline_at": "2026-07-21T20:00:00+00:00",
            "penalty_cents": 200,
            "status": "pending",
        }
        assert isinstance(habit["penalty_cents"], int)
        datetime.fromisoformat(habit["deadline_at"])

    with connection_for(database_path) as connection:
        habit_columns = {row["name"]: row["type"] for row in connection.execute("PRAGMA table_info(habits)")}
        fine_columns = {row["name"]: row["type"] for row in connection.execute("PRAGMA table_info(fines)")}
        assert habit_columns["penalty_cents"] == "INTEGER"
        assert fine_columns["amount_cents"] == "INTEGER"
        assert "penalty" not in habit_columns
        assert "amount" not in fine_columns


def test_complete_is_idempotent(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        first = client.post("/habits/habit-exercise-today/complete")
        second = client.post("/habits/habit-exercise-today/complete")
        assert first.status_code == second.status_code == 200
        assert second.json()["habit"]["status"] == "completed"


def test_skip_creates_one_open_session(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        first = client.post("/habits/habit-exercise-today/skip")
        second = client.post("/habits/habit-exercise-today/skip")
        assert first.status_code == second.status_code == 200
        assert first.json() == {
            "session_id": first.json()["session_id"],
            "state": "awaiting_plea",
            "created": True,
        }
        assert second.json()["created"] is False
        assert first.json()["session_id"] == second.json()["session_id"]
        assert client.get("/today").json()["session"]["state"] == "awaiting_plea"


def test_reset_restores_seed_and_empty_cents_ledger(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.setenv("DEMO_RESET_ENABLED", "true")
    with client_for(tmp_path) as client:
        client.post("/habits/habit-exercise-today/skip")
        response = client.post("/demo/reset")
        assert response.status_code == 200
        assert response.json()["today"]["habit"]["status"] == "pending"
        assert response.json()["today"]["session"] is None
        assert response.json()["ledger"] == {"balance_cents": 0, "entries": []}


def test_cors_accepts_expo_localhost(tmp_path: Path) -> None:
    with client_for(tmp_path) as client:
        response = client.options(
            "/today",
            headers={
                "Origin": "http://localhost:8082",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert response.status_code == 200
        assert response.headers["access-control-allow-origin"] == "http://localhost:8082"


def test_existing_sessions_gain_transcript_columns_without_data_loss(tmp_path: Path) -> None:
    database_path = tmp_path / "court-session-migration.db"
    with connection_for(database_path) as connection:
        connection.executescript(
            """
            CREATE TABLE habits (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                minutes INTEGER NOT NULL,
                deadline_at TEXT NOT NULL,
                penalty_cents INTEGER NOT NULL,
                status TEXT NOT NULL
            );
            CREATE TABLE fines (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL UNIQUE,
                amount_cents INTEGER NOT NULL,
                reason TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
            CREATE TABLE court_sessions (
                id TEXT PRIMARY KEY,
                habit_id TEXT NOT NULL,
                state TEXT NOT NULL,
                plea TEXT,
                normalized_plea TEXT,
                plea_category TEXT,
                prosecutor_json TEXT,
                rebuttal TEXT,
                verdict_json TEXT,
                prosecutor_source TEXT,
                judge_source TEXT,
                created_at TEXT NOT NULL,
                resolved_at TEXT
            );
            """
        )
        connection.execute(
            "INSERT INTO habits VALUES (?, ?, ?, ?, ?, ?)",
            ("existing-habit", "Existing habit", 30, "2026-07-21T20:00:00+00:00", 200, "skipped"),
        )
        connection.execute(
            "INSERT INTO court_sessions (id, habit_id, state, created_at) VALUES (?, ?, ?, ?)",
            ("existing-session", "existing-habit", "awaiting_plea", "2026-07-21T10:00:00+00:00"),
        )

    initialize_database(database_path)

    with connection_for(database_path) as connection:
        columns = {row["name"] for row in connection.execute("PRAGMA table_info(court_sessions)")}
        session = connection.execute(
            "SELECT id, transcript_json, turn_count FROM court_sessions WHERE id = ?", ("existing-session",)
        ).fetchone()

    assert {"transcript_json", "turn_count"}.issubset(columns)
    assert session["id"] == "existing-session"
    assert session["transcript_json"] == "[]"
    assert session["turn_count"] == 0
