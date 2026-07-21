from __future__ import annotations

import os
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator


DEFAULT_DATABASE_PATH = Path(__file__).resolve().parents[1] / "objection.db"
SEED_HABIT_ID = "habit-exercise-today"
SEED_DEADLINE_AT = "2026-07-21T20:00:00+00:00"
SEED_EXCUSES = (
    ("I was too tired", "ordinary"),
    ("I had a headache", "health"),
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def configured_database_path() -> Path:
    value = os.getenv("DATABASE_PATH", "").strip()
    return Path(value).expanduser().resolve() if value else DEFAULT_DATABASE_PATH


def connect(database_path: Path) -> sqlite3.Connection:
    database_path.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(database_path, timeout=5, isolation_level=None)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def connection_for(database_path: Path) -> Iterator[sqlite3.Connection]:
    connection = connect(database_path)
    try:
        yield connection
    finally:
        connection.close()


def _legacy_schema_present(connection: sqlite3.Connection) -> bool:
    tables = {
        row["name"]
        for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'").fetchall()
    }
    if "habits" not in tables or "fines" not in tables:
        return False
    habit_columns = {row["name"] for row in connection.execute("PRAGMA table_info(habits)").fetchall()}
    fine_columns = {row["name"] for row in connection.execute("PRAGMA table_info(fines)").fetchall()}
    return "deadline_at" not in habit_columns or "penalty_cents" not in habit_columns or "amount_cents" not in fine_columns


def _ensure_court_session_columns(connection: sqlite3.Connection) -> None:
    """Apply additive, data-preserving upgrades to the local court record."""
    columns = {row["name"] for row in connection.execute("PRAGMA table_info(court_sessions)").fetchall()}
    if "transcript_json" not in columns:
        connection.execute("ALTER TABLE court_sessions ADD COLUMN transcript_json TEXT NOT NULL DEFAULT '[]'")
    if "turn_count" not in columns:
        connection.execute("ALTER TABLE court_sessions ADD COLUMN turn_count INTEGER NOT NULL DEFAULT 0")


def initialize_database(database_path: Path) -> None:
    with connection_for(database_path) as connection:
        connection.execute("BEGIN IMMEDIATE")
        try:
            # Day 2 is a local demo migration. Old Day 1 state only contained
            # generated seed data, so replacing it is safer than preserving
            # floating-point money or display-formatted deadlines.
            if _legacy_schema_present(connection):
                connection.executescript(
                    """
                    DROP TABLE IF EXISTS fines;
                    DROP TABLE IF EXISTS court_sessions;
                    DROP TABLE IF EXISTS excuse_memories;
                    DROP TABLE IF EXISTS habits;
                    """
                )

            connection.executescript(
                """
                CREATE TABLE IF NOT EXISTS habits (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    minutes INTEGER NOT NULL CHECK (minutes > 0),
                    deadline_at TEXT NOT NULL,
                    penalty_cents INTEGER NOT NULL CHECK (penalty_cents >= 0),
                    status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'skipped'))
                );

                CREATE TABLE IF NOT EXISTS excuse_memories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
                    normalized_reason TEXT NOT NULL,
                    category TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS court_sessions (
                    id TEXT PRIMARY KEY,
                    habit_id TEXT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
                    state TEXT NOT NULL CHECK (state IN ('awaiting_plea', 'awaiting_rebuttal', 'resolved')),
                    plea TEXT,
                    normalized_plea TEXT,
                    plea_category TEXT,
                    prosecutor_json TEXT,
                    rebuttal TEXT,
                    transcript_json TEXT NOT NULL DEFAULT '[]',
                    turn_count INTEGER NOT NULL DEFAULT 0,
                    verdict_json TEXT,
                    prosecutor_source TEXT,
                    judge_source TEXT,
                    created_at TEXT NOT NULL,
                    resolved_at TEXT
                );

                CREATE UNIQUE INDEX IF NOT EXISTS one_open_session_per_habit
                    ON court_sessions(habit_id)
                    WHERE state IN ('awaiting_plea', 'awaiting_rebuttal');

                CREATE TABLE IF NOT EXISTS fines (
                    id TEXT PRIMARY KEY,
                    session_id TEXT NOT NULL UNIQUE REFERENCES court_sessions(id) ON DELETE CASCADE,
                    amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
                    reason TEXT NOT NULL,
                    created_at TEXT NOT NULL
                );
                """
            )
            _ensure_court_session_columns(connection)
            habit = connection.execute("SELECT id FROM habits WHERE id = ?", (SEED_HABIT_ID,)).fetchone()
            if habit is None:
                seed_database(connection)
            connection.commit()
        except Exception:
            connection.rollback()
            raise


def seed_database(connection: sqlite3.Connection) -> None:
    timestamp = utc_now()
    connection.execute(
        """
        INSERT INTO habits (id, title, minutes, deadline_at, penalty_cents, status)
        VALUES (?, ?, ?, ?, ?, ?)
        """,
        (SEED_HABIT_ID, "30 minutes of exercise", 30, SEED_DEADLINE_AT, 200, "pending"),
    )
    connection.executemany(
        """
        INSERT INTO excuse_memories (habit_id, normalized_reason, category, created_at)
        VALUES (?, ?, ?, ?)
        """,
        [(SEED_HABIT_ID, reason, category, timestamp) for reason, category in SEED_EXCUSES],
    )


def reset_database(database_path: Path) -> None:
    with connection_for(database_path) as connection:
        connection.execute("BEGIN IMMEDIATE")
        try:
            connection.execute("DELETE FROM fines")
            connection.execute("DELETE FROM court_sessions")
            connection.execute("DELETE FROM excuse_memories")
            connection.execute("DELETE FROM habits")
            seed_database(connection)
            connection.commit()
        except Exception:
            connection.rollback()
            raise
