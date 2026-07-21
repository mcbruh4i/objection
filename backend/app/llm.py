from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass
from typing import Generic, Literal, TypeVar
from urllib.parse import urlsplit

import httpx
from pydantic import BaseModel, ValidationError


Role = Literal["prosecutor", "judge"]
OutputModel = TypeVar("OutputModel", bound=BaseModel)
REQUEST_TIMEOUT_SECONDS = 18
MAX_ATTEMPTS = 2
logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class LLMSettings:
    base_url: str
    api_key: str
    prosecutor_model: str
    judge_model: str

    @classmethod
    def from_environment(cls) -> "LLMSettings":
        return cls(
            base_url=os.getenv("LLM_BASE_URL", "").strip(),
            api_key=os.getenv("LLM_API_KEY", "").strip(),
            prosecutor_model=os.getenv("LLM_MODEL_PROSECUTOR", "").strip(),
            judge_model=os.getenv("LLM_MODEL_JUDGE", "").strip(),
        )

    def model_for(self, role: Role) -> str:
        return self.prosecutor_model if role == "prosecutor" else self.judge_model

    def available_for(self, role: Role) -> bool:
        return bool(self.base_url and self.api_key and self.model_for(role))

    def intentionally_unconfigured(self) -> bool:
        """True only when the operator deliberately left model mode blank."""
        return not any((self.base_url, self.api_key, self.prosecutor_model, self.judge_model))


@dataclass(frozen=True)
class LLMResult(Generic[OutputModel]):
    value: OutputModel | None
    source: Literal["live", "fallback"]
    configured: bool = False


class LLMAdapter:
    """Small provider-neutral JSON client used by both courtroom roles."""

    def __init__(self, settings: LLMSettings | None = None) -> None:
        self.settings = settings or LLMSettings.from_environment()

    def complete_json(
        self,
        *,
        role: Role,
        system_prompt: str,
        evidence_prompt: str,
        output_model: type[OutputModel],
        raise_on_failure: bool = False,
    ) -> LLMResult[OutputModel]:
        if not self.settings.available_for(role):
            error = "LLM_BASE_URL, LLM_API_KEY, or the role model is missing"
            logger.warning(
                "LLM request skipped role=%s model=%s error_type=ConfigurationError error=%s",
                role,
                self.settings.model_for(role) or "<missing>",
                error,
            )
            logger.warning(
                "LLM fallback activated role=%s model=%s attempts=0 error_type=ConfigurationError error=%s",
                role,
                self.settings.model_for(role) or "<missing>",
                error,
            )
            if raise_on_failure:
                raise RuntimeError(error)
            return LLMResult(
                value=None,
                source="fallback",
                configured=not self.settings.intentionally_unconfigured(),
            )

        endpoint = self._endpoint()
        endpoint_label = self._endpoint_label(endpoint)
        headers = {
            "Authorization": f"Bearer {self.settings.api_key}",
            "Content-Type": "application/json",
        }
        repair_instruction = "\nReturn only valid JSON matching the required schema; do not add prose."
        last_error: Exception | None = None

        for attempt in range(MAX_ATTEMPTS):
            user_content = evidence_prompt if attempt == 0 else f"{evidence_prompt}{repair_instruction}"
            payload = {
                "model": self.settings.model_for(role),
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content},
                ],
                "temperature": 0.2,
                "response_format": {"type": "json_object"},
            }
            logger.warning(
                "LLM request started role=%s model=%s endpoint=%s attempt=%d/%d",
                role,
                self.settings.model_for(role),
                endpoint_label,
                attempt + 1,
                MAX_ATTEMPTS,
            )
            try:
                with httpx.Client(timeout=REQUEST_TIMEOUT_SECONDS) as client:
                    response = client.post(endpoint, headers=headers, json=payload)
                    response.raise_for_status()
                content = self._content_from_response(response.json())
                parsed = json.loads(content)
                value = output_model.model_validate(parsed)
                logger.warning(
                    "LLM request succeeded role=%s model=%s endpoint=%s attempt=%d/%d",
                    role,
                    self.settings.model_for(role),
                    endpoint_label,
                    attempt + 1,
                    MAX_ATTEMPTS,
                )
                return LLMResult(value=value, source="live", configured=True)
            except (
                httpx.HTTPError,
                IndexError,
                KeyError,
                TypeError,
                ValueError,
                ValidationError,
                json.JSONDecodeError,
            ) as error:
                # A failed model call never reaches the player; callers choose a
                # deterministic, policy-constrained fallback instead.
                last_error = error
                logger.warning(
                    "LLM request failed role=%s model=%s endpoint=%s attempt=%d/%d error_type=%s error=%s",
                    role,
                    self.settings.model_for(role),
                    endpoint_label,
                    attempt + 1,
                    MAX_ATTEMPTS,
                    type(error).__name__,
                    error,
                )
                continue

        error_type = type(last_error).__name__ if last_error is not None else "UnknownError"
        error_message = str(last_error) if last_error is not None else "LLM request failed without a captured exception"
        logger.warning(
            "LLM fallback activated role=%s model=%s attempts=%d error_type=%s error=%s",
            role,
            self.settings.model_for(role),
            MAX_ATTEMPTS,
            error_type,
            error_message,
        )
        if raise_on_failure and last_error is not None:
            raise last_error
        return LLMResult(value=None, source="fallback", configured=True)

    def _endpoint(self) -> str:
        base = self.settings.base_url.rstrip("/")
        return base if base.endswith("/chat/completions") else f"{base}/chat/completions"

    @staticmethod
    def _endpoint_label(endpoint: str) -> str:
        """Log a target's host and path without ever logging a query or secret."""
        parsed = urlsplit(endpoint)
        return f"{parsed.netloc}{parsed.path}" if parsed.netloc else parsed.path

    @staticmethod
    def _content_from_response(payload: object) -> str:
        choices = payload["choices"]  # type: ignore[index]
        content = choices[0]["message"]["content"]
        if isinstance(content, str):
            return content
        if isinstance(content, list):
            text_parts = [item.get("text", "") for item in content if isinstance(item, dict)]
            return "".join(text_parts)
        raise TypeError("Expected text content in the model response.")
