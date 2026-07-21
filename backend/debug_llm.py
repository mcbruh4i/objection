from __future__ import annotations

import json
import sys
import traceback
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from app.court import evaluate_policy, prosecutor_response
from app.llm import LLMAdapter


ENV_PATH = Path(__file__).resolve().with_name(".env")
DEBUG_PLEA = "I had a headache again and need the court to hear my explanation."
DEBUG_MEMORIES = [{"reason": "I had a headache", "category": "health"}]


class RaisingAdapter:
    """Use the production adapter while surfacing its final diagnostic failure."""

    def __init__(self, adapter: LLMAdapter) -> None:
        self._adapter = adapter

    def complete_json(self, **kwargs: Any) -> Any:
        return self._adapter.complete_json(**kwargs, raise_on_failure=True)


def main() -> int:
    if not ENV_PATH.is_file():
        print(f"Missing backend .env: {ENV_PATH}", file=sys.stderr)
        return 2

    # This is the same env file Uvicorn should receive through --env-file.
    # Never override explicitly exported environment variables.
    load_dotenv(ENV_PATH, override=False)
    policy = evaluate_policy(DEBUG_PLEA, (memory["reason"] for memory in DEBUG_MEMORIES))

    try:
        response, source = prosecutor_response(
            adapter=RaisingAdapter(LLMAdapter()),  # type: ignore[arg-type]
            habit_title="30 minutes of exercise",
            plea=DEBUG_PLEA,
            memories=DEBUG_MEMORIES,
            policy=policy,
        )
        if source != "live":
            raise RuntimeError("The model response was rejected by the courtroom response checks; see WARNING logs above.")
        print(json.dumps(response.model_dump(), ensure_ascii=False, indent=2))
        return 0
    except Exception:
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
