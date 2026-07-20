from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class HabitResponse(StrictModel):
    id: str
    title: str
    minutes: int
    deadline_at: str
    penalty_cents: int
    status: str


class TextSubmission(StrictModel):
    text: str = Field(min_length=1, max_length=600)


class HabitCreate(StrictModel):
    title: str = Field(min_length=1, max_length=120)
    minutes: int = Field(default=30, ge=1, le=600)
    penalty_cents: int = Field(default=200, ge=0, le=100_000)
    deadline_at: str | None = None


class ProsecutorResponse(StrictModel):
    objection: str = Field(min_length=1, max_length=280)
    challenge: str = Field(min_length=1, max_length=500)
    question: str = Field(min_length=1, max_length=280)
    emotion: str = Field(min_length=1, max_length=80)


class SessionSummary(StrictModel):
    id: str
    state: Literal["awaiting_plea", "awaiting_rebuttal", "resolved"]
    prosecutor: ProsecutorResponse | None = None


class TodayResponse(StrictModel):
    habit: HabitResponse
    habits: list[HabitResponse] = Field(default_factory=list)
    session: SessionSummary | None = None


class SkipResponse(StrictModel):
    session_id: str
    state: Literal["awaiting_plea", "awaiting_rebuttal", "resolved"]
    created: bool


class JudgeVerdict(StrictModel):
    verdict: Literal["accepted", "rejected"]
    reasoning: str = Field(min_length=1, max_length=500)
    fine_multiplier: Literal[0, 1, 1.5, 2]
    judge_emotion: str = Field(min_length=1, max_length=80)
    evidence_required: bool
    excuse_category: Literal[
        "ordinary",
        "health",
        "safety",
        "emergency",
        "disability",
        "caregiving",
        "injection",
    ]


class FineResponse(StrictModel):
    id: str
    amount_cents: int
    reason: str
    created_at: str
    status: Literal["recorded"] = "recorded"


class PleaResponse(StrictModel):
    session_id: str
    state: Literal["awaiting_rebuttal"]
    repeated: bool
    prosecutor: ProsecutorResponse
    source: Literal["live", "fallback"]


class RebuttalResponse(StrictModel):
    session_id: str
    state: Literal["resolved"]
    verdict: JudgeVerdict
    fine: FineResponse
    source: Literal["live", "fallback", "absentia"]


class LedgerEntryResponse(FineResponse):
    pass


class LedgerResponse(StrictModel):
    balance_cents: int
    entries: list[LedgerEntryResponse]


class DemoResetResponse(StrictModel):
    today: TodayResponse
    ledger: LedgerResponse
