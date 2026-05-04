from __future__ import annotations
import time
from fastapi import APIRouter
from ulid import ULID
from cct.models.domain import IngestEvent
from cct.models.api import IngestResponse
from cct.pipeline.queue import enqueue

router = APIRouter(prefix="/api/v1")

@router.post("/ingest", response_model=IngestResponse)
async def ingest(event: IngestEvent):
    eid = str(ULID())
    now = int(time.time() * 1000)
    payload = event.model_dump()
    payload["_event_id"] = eid
    await enqueue(payload)
    return IngestResponse(accepted=True, event_id=eid, queued_at=now)
