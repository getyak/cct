from __future__ import annotations

from fastapi import APIRouter, Query

from cct.storage.db import get_db
from cct.storage.repositories.stats_repo import intent_distribution, token_usage

router = APIRouter(prefix="/api/v1")

@router.get("/stats/intents")
async def stats_intents(from_ts: int | None = None, to_ts: int | None = None):
    db = await get_db()
    try:
        return await intent_distribution(db, from_ts, to_ts)
    finally:
        await db.close()

@router.get("/stats/tokens")
async def stats_tokens(
    from_ts: int | None = None,
    to_ts: int | None = None,
    bucket: str = Query("day", pattern="^(hour|day)$"),
):
    db = await get_db()
    try:
        return await token_usage(db, from_ts, to_ts, bucket)
    finally:
        await db.close()
