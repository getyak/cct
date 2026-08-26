from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class TokenUsage(BaseModel):
    input: int = 0
    output: int = 0
    cache_read: int = 0
    cache_creation: int = 0

class ToolEvent(BaseModel):
    name: str
    input: dict[str, Any] = Field(default_factory=dict)
    output: str | None = None
    duration_ms: int | None = None
    succeeded: bool = True

class IngestEvent(BaseModel):
    source: Literal["claude_code", "http_api", "cli"] = "http_api"
    event_type: Literal["user_prompt", "assistant_reply", "tool_use", "session_end"]
    session_id: str | None = None
    timestamp: int  # unix ms
    project_path: str | None = None
    project_name: str | None = None
    role: Literal["user", "assistant", "system"] | None = None
    content: str | None = None
    tokens: TokenUsage | None = None
    model: str | None = None
    tool: ToolEvent | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

class IntentResult(BaseModel):
    primary: Literal[
        "coding", "debugging", "architecture", "documentation",
        "question", "planning", "review", "other"
    ]
    secondary: list[str] = []
    confidence: float
    classifier: str
    keywords: list[str] = []
    summary: str | None = None
