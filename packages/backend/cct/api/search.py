from __future__ import annotations

from fastapi import APIRouter, Query

from cct.storage.db import get_db
from cct.storage.repositories.message_repo import search

router = APIRouter(prefix="/api/v1")

@router.get("/search")
async def search_messages(q: str = Query(..., min_length=1), limit: int = 20):
    db = await get_db()
    try:
        return await search(db, q, limit)
    finally:
        await db.close()
