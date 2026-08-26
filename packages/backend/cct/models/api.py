from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class IngestResponse(BaseModel):
    accepted: bool
    event_id: str
    queued_at: int

class SessionDTO(BaseModel):
    id: str
    source: str
    project_path: str | None
    project_name: str | None
    title: str | None = None
    started_at: int
    ended_at: int | None
    message_count: int
    total_input_tokens: int
    total_output_tokens: int
    metadata: dict[str, Any] | None

class MessageDTO(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: int
    input_tokens: int | None
    output_tokens: int | None
    model: str | None
    intent: dict[str, Any] | None = None

class StatsIntentDTO(BaseModel):
    intent: str
    count: int
    percentage: float

class StatsTokenDTO(BaseModel):
    bucket: str
    input_tokens: int
    output_tokens: int

class SearchResult(BaseModel):
    message_id: str
    session_id: str
    role: str
    snippet: str
    created_at: int
    primary_intent: str | None
