from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from contextlib import asynccontextmanager, contextmanager
from pathlib import Path
from threading import Lock
from typing import AsyncIterator, Iterator, Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .court import evaluate_policy, judge_response, normalize_reason, prosecutor_response
from .database import configured_database_path, connection_for, initialize_database, reset_database, utc_now
from .llm import LLMAdapter
from .schemas import (
    DemoResetResponse,
    FineResponse,
    HabitCreate,
    HabitResponse,
    JudgeVerdict,
    LedgerEntryResponse,
    LedgerResponse,
    PleaResponse,
    ProsecutorResponse,
    RebuttalResponse,
    SessionSummary,
    SkipResponse,
    TextSubmission,
    TodayResponse,
)


class SessionStageSingleFlight:
    """Serialize a local server's outbound work for one session and stage."""

    def __init__(self) -> None:
        self._guard = Lock()
        self._locks: dict[tuple[str, str], Lock] = {}

    @contextmanager
    def hold(self, session_id: str, stage: Literal["prosecutor", "judge"]) -> Iterator[None]:
        key = (session_id, stage)
        with self._guard:
            lock = self._locks.setdefault(key, Lock())
        with lock:
            yield


def _demo_reset_enabled() -> bool:
    return (
        os.getenv("APP_ENV", "").strip().casefold() == "development"
        and os.getenv("DEMO_RESET_ENABLED", "").strip().casefold() in {"1", "true", "yes", "on"}
    )


def _row_to_habit(row: sqlite3.Row) -> HabitResponse:
    return HabitResponse(
        id=row["id"],
        title=row["title"],
        minutes=row["minutes"],
        deadline_at=row["deadline_at"],
        penalty_cents=row["penalty_cents"],
        status=row["status"],
    )


def _read_today(database_path: Path) -> TodayResponse:
    with connection_for(database_path) as connection:
        habit_rows = connection.execute(
            "SELECT id, title, minutes, deadline_at, penalty_cents, status FROM habits ORDER BY rowid"
        ).fetchall()
        if not habit_rows:
            raise RuntimeError("Seeded habit is missing.")
        session = connection.execute(
            """
            SELECT id, state, prosecutor_json FROM court_sessions
            WHERE state IN ('awaiting_plea', 'awaiting_rebuttal')
            ORDER BY created_at DESC LIMIT 1
            """
        ).fetchone()
    prosecutor = None
    if session is not None and session["prosecutor_json"]:
        try:
            prosecutor = ProsecutorResponse.model_validate(json.loads(session["prosecutor_json"]))
        except (TypeError, ValueError):
            prosecutor = None
    habits = [_row_to_habit(row) for row in habit_rows]
    primary = next((entry for entry in habits if entry.status == "pending"), habits[0])
    return TodayResponse(
        habit=primary,
        habits=habits,
        session=SessionSummary(id=session["id"], state=session["state"], prosecutor=prosecutor) if session else None,
    )


def _fine_from_row(row: sqlite3.Row) -> FineResponse:
    return FineResponse(
        id=row["id"],
        amount_cents=row["amount_cents"],
        reason=row["reason"],
        created_at=row["created_at"],
    )


def _read_ledger(database_path: Path) -> LedgerResponse:
    with connection_for(database_path) as connection:
        rows = connection.execute(
            "SELECT id, amount_cents, reason, created_at FROM fines ORDER BY created_at DESC, id DESC"
        ).fetchall()
    entries = [
        LedgerEntryResponse(
            id=row["id"],
            amount_cents=row["amount_cents"],
            reason=row["reason"],
            created_at=row["created_at"],
        )
        for row in rows
    ]
    return LedgerResponse(balance_cents=sum(entry.amount_cents for entry in entries), entries=entries)


def _session_context(database_path: Path, session_id: str) -> tuple[sqlite3.Row, sqlite3.Row, list[sqlite3.Row]]:
    with connection_for(database_path) as connection:
        session = connection.execute("SELECT * FROM court_sessions WHERE id = ?", (session_id,)).fetchone()
        if session is None:
            raise HTTPException(status_code=404, detail="Court session not found.")
        habit = connection.execute("SELECT * FROM habits WHERE id = ?", (session["habit_id"],)).fetchone()
        if habit is None:
            raise RuntimeError("Court session habit is missing.")
        memories = connection.execute(
            """
            SELECT normalized_reason, category FROM excuse_memories
            WHERE category != 'injection'
            ORDER BY id
            """
        ).fetchall()
    return session, habit, memories


def _memory_payload(memories: list[sqlite3.Row]) -> list[dict[str, str]]:
    return [{"reason": row["normalized_reason"], "category": row["category"]} for row in memories]


def _reason_for(verdict: JudgeVerdict, source: Literal["live", "fallback", "absentia"]) -> str:
    if source == "absentia":
        return "Court issued a default absentia ruling after the Judge call failed."
    if verdict.verdict == "accepted":
        return "Case accepted — no mock fine."
    if verdict.excuse_category == "injection":
        return "Court rejected an attempt to direct the verdict."
    return "Court rejected a repeated excuse."


def _amount_cents(penalty_cents: int, verdict: JudgeVerdict) -> int:
    """Calculate mock money using integer arithmetic only."""
    if verdict.verdict == "accepted":
        return 0
    if verdict.excuse_category == "injection":
        return penalty_cents * 2
    if verdict.fine_multiplier == 1:
        return penalty_cents
    if verdict.fine_multiplier == 1.5:
        return penalty_cents * 3 // 2
    if verdict.fine_multiplier == 2:
        return penalty_cents * 2
    return 0


def _resolved_response(database_path: Path, session_id: str) -> RebuttalResponse:
    with connection_for(database_path) as connection:
        session = connection.execute("SELECT * FROM court_sessions WHERE id = ?", (session_id,)).fetchone()
        fine = connection.execute(
            "SELECT id, amount_cents, reason, created_at FROM fines WHERE session_id = ?", (session_id,)
        ).fetchone()
    if session is None or session["state"] != "resolved" or session["verdict_json"] is None or fine is None:
        raise HTTPException(status_code=409, detail="The verdict is not available yet.")
    return RebuttalResponse(
        session_id=session_id,
        state="resolved",
        verdict=JudgeVerdict.model_validate(json.loads(session["verdict_json"])),
        fine=_fine_from_row(fine),
        source=session["judge_source"] if session["judge_source"] in {"live", "fallback", "absentia"} else "fallback",
    )


def create_app(database_path: str | Path | None = None) -> FastAPI:
    path = Path(database_path).resolve() if database_path else configured_database_path()
    adapter = LLMAdapter()
    flights = SessionStageSingleFlight()

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        initialize_database(path)
        yield

    app = FastAPI(title="Objection! API", version="0.2.0", lifespan=lifespan)
    configured_origins = [
        origin.strip()
        for origin in os.getenv("CORS_ORIGINS", "http://localhost:8081,http://127.0.0.1:8081").split(",")
        if origin.strip()
    ]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=configured_origins,
        allow_origin_regex=r"^http://(localhost|127\.0\.0\.1)(:\d+)?$",
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Accept"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/today", response_model=TodayResponse)
    def get_today() -> TodayResponse:
        return _read_today(path)

    @app.post("/habits", response_model=TodayResponse, status_code=201)
    def create_habit(body: HabitCreate) -> TodayResponse:
        title = body.title.strip()
        if not title:
            raise HTTPException(status_code=422, detail="The promise needs a name.")
        deadline_at = body.deadline_at
        if deadline_at is None:
            deadline_at = datetime.now(timezone.utc).replace(hour=23, minute=59, second=0, microsecond=0).isoformat()
        else:
            try:
                datetime.fromisoformat(deadline_at)
            except ValueError as error:
                raise HTTPException(status_code=422, detail="deadline_at must be an ISO-8601 timestamp.") from error
        habit_id = str(uuid.uuid4())
        with connection_for(path) as connection:
            connection.execute("BEGIN IMMEDIATE")
            try:
                total = connection.execute("SELECT COUNT(*) AS total FROM habits").fetchone()["total"]
                if total >= 6:
                    raise HTTPException(status_code=409, detail="The docket is full: six promises per day at most.")
                connection.execute(
                    """
                    INSERT INTO habits (id, title, minutes, deadline_at, penalty_cents, status)
                    VALUES (?, ?, ?, ?, ?, 'pending')
                    """,
                    (habit_id, title, body.minutes, deadline_at, body.penalty_cents),
                )
                connection.commit()
            except Exception:
                connection.rollback()
                raise
        return _read_today(path)

    @app.post("/habits/{habit_id}/complete", response_model=TodayResponse)
    def complete_habit(habit_id: str) -> TodayResponse:
        with connection_for(path) as connection:
            connection.execute("BEGIN IMMEDIATE")
            try:
                habit = connection.execute("SELECT status FROM habits WHERE id = ?", (habit_id,)).fetchone()
                if habit is None:
                    raise HTTPException(status_code=404, detail="Habit not found.")
                if habit["status"] == "skipped":
                    raise HTTPException(status_code=409, detail="A court session is already open for this habit.")
                connection.execute("UPDATE habits SET status = 'completed' WHERE id = ?", (habit_id,))
                connection.commit()
            except Exception:
                connection.rollback()
                raise
        return _read_today(path)

    @app.post("/habits/{habit_id}/skip", response_model=SkipResponse)
    def skip_habit(habit_id: str) -> SkipResponse:
        with connection_for(path) as connection:
            connection.execute("BEGIN IMMEDIATE")
            try:
                habit = connection.execute("SELECT status FROM habits WHERE id = ?", (habit_id,)).fetchone()
                if habit is None:
                    raise HTTPException(status_code=404, detail="Habit not found.")
                if habit["status"] == "completed":
                    raise HTTPException(status_code=409, detail="This habit has already been completed.")
                existing = connection.execute(
                    """
                    SELECT id, state FROM court_sessions
                    WHERE habit_id = ?
                    ORDER BY created_at DESC LIMIT 1
                    """,
                    (habit_id,),
                ).fetchone()
                if existing:
                    connection.commit()
                    return SkipResponse(session_id=existing["id"], state=existing["state"], created=False)

                session_id = str(uuid.uuid4())
                connection.execute("UPDATE habits SET status = 'skipped' WHERE id = ?", (habit_id,))
                connection.execute(
                    """
                    INSERT INTO court_sessions (id, habit_id, state, created_at)
                    VALUES (?, ?, 'awaiting_plea', ?)
                    """,
                    (session_id, habit_id, utc_now()),
                )
                connection.commit()
                return SkipResponse(session_id=session_id, state="awaiting_plea", created=True)
            except Exception:
                connection.rollback()
                raise

    @app.post("/court/{session_id}/plea", response_model=PleaResponse)
    def submit_plea(session_id: str, body: TextSubmission) -> PleaResponse:
        with flights.hold(session_id, "prosecutor"):
            session, habit, memories = _session_context(path, session_id)
            if session["state"] == "awaiting_rebuttal" and session["prosecutor_json"]:
                policy = evaluate_policy(session["plea"], [row["normalized_reason"] for row in memories])
                return PleaResponse(
                    session_id=session_id,
                    state="awaiting_rebuttal",
                    repeated=policy.repeated,
                    prosecutor=ProsecutorResponse.model_validate(json.loads(session["prosecutor_json"])),
                    source=session["prosecutor_source"] if session["prosecutor_source"] in {"live", "fallback"} else "fallback",
                )
            if session["state"] != "awaiting_plea":
                raise HTTPException(status_code=409, detail="This court session is already resolved.")

            memory_payload = _memory_payload(memories)
            policy = evaluate_policy(body.text, [row["normalized_reason"] for row in memories])
            prosecutor, source = prosecutor_response(
                adapter=adapter,
                habit_title=habit["title"],
                plea=body.text,
                memories=memory_payload,
                policy=policy,
            )
            with connection_for(path) as connection:
                connection.execute("BEGIN IMMEDIATE")
                try:
                    current = connection.execute("SELECT state FROM court_sessions WHERE id = ?", (session_id,)).fetchone()
                    if current is None:
                        raise HTTPException(status_code=404, detail="Court session not found.")
                    if current["state"] != "awaiting_plea":
                        raise HTTPException(status_code=409, detail="This plea has already been heard.")
                    connection.execute(
                        """
                        UPDATE court_sessions
                        SET state = 'awaiting_rebuttal', plea = ?, normalized_plea = ?, plea_category = ?,
                            prosecutor_json = ?, prosecutor_source = ?
                        WHERE id = ?
                        """,
                        (
                            body.text,
                            normalize_reason(body.text),
                            policy.category,
                            json.dumps(prosecutor.model_dump()),
                            source,
                            session_id,
                        ),
                    )
                    connection.commit()
                except Exception:
                    connection.rollback()
                    raise
            return PleaResponse(
                session_id=session_id,
                state="awaiting_rebuttal",
                repeated=policy.repeated,
                prosecutor=prosecutor,
                source=source,
            )

    @app.post("/court/{session_id}/rebuttal", response_model=RebuttalResponse)
    def submit_rebuttal(session_id: str, body: TextSubmission) -> RebuttalResponse:
        with flights.hold(session_id, "judge"):
            session, habit, memories = _session_context(path, session_id)
            if session["state"] == "resolved":
                return _resolved_response(path, session_id)
            if session["state"] != "awaiting_rebuttal" or not session["plea"]:
                raise HTTPException(status_code=409, detail="The plea must be heard before a rebuttal.")

            memory_payload = _memory_payload(memories)
            policy = evaluate_policy(session["plea"], [row["normalized_reason"] for row in memories], body.text)
            verdict, source = judge_response(
                adapter=adapter,
                habit_title=habit["title"],
                plea=session["plea"],
                rebuttal=body.text,
                memories=memory_payload,
                policy=policy,
            )
            amount_cents = _amount_cents(habit["penalty_cents"], verdict)
            fine = FineResponse(
                id=str(uuid.uuid4()),
                amount_cents=amount_cents,
                reason=_reason_for(verdict, source),
                created_at=utc_now(),
            )

            with connection_for(path) as connection:
                connection.execute("BEGIN IMMEDIATE")
                try:
                    current = connection.execute("SELECT state FROM court_sessions WHERE id = ?", (session_id,)).fetchone()
                    if current is None:
                        raise HTTPException(status_code=404, detail="Court session not found.")
                    if current["state"] == "resolved":
                        connection.rollback()
                        return _resolved_response(path, session_id)
                    if current["state"] != "awaiting_rebuttal":
                        raise HTTPException(status_code=409, detail="The plea must be heard before a rebuttal.")

                    connection.execute(
                        """
                        INSERT INTO fines (id, session_id, amount_cents, reason, created_at)
                        VALUES (?, ?, ?, ?, ?)
                        """,
                        (fine.id, session_id, fine.amount_cents, fine.reason, fine.created_at),
                    )
                    connection.execute(
                        """
                        UPDATE court_sessions
                        SET state = 'resolved', rebuttal = ?, verdict_json = ?, judge_source = ?, resolved_at = ?
                        WHERE id = ?
                        """,
                        (body.text, json.dumps(verdict.model_dump()), source, utc_now(), session_id),
                    )
                    if policy.category != "injection":
                        connection.execute(
                            """
                            INSERT INTO excuse_memories (habit_id, normalized_reason, category, created_at)
                            VALUES (?, ?, ?, ?)
                            """,
                            (habit["id"], normalize_reason(session["plea"]), policy.category, utc_now()),
                        )
                    connection.commit()
                except Exception:
                    connection.rollback()
                    raise
            return RebuttalResponse(session_id=session_id, state="resolved", verdict=verdict, fine=fine, source=source)

    @app.get("/ledger", response_model=LedgerResponse)
    def get_ledger() -> LedgerResponse:
        return _read_ledger(path)

    if _demo_reset_enabled():

        @app.post("/demo/reset", response_model=DemoResetResponse)
        def reset_demo() -> DemoResetResponse:
            reset_database(path)
            return DemoResetResponse(today=_read_today(path), ledger=_read_ledger(path))

    return app


app = create_app()
