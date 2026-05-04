from __future__ import annotations
from fastapi import APIRouter, Query
from cct.storage.db import get_db
from cct.storage.repositories import session_repo, message_repo

router = APIRouter(prefix="/api/v1")

@router.get("/sessions")
async def list_sessions(
    limit: int = Query(50, le=200),
    cursor: int | None = None,
    project: str | None = None,
):
    db = await get_db()
    try:
        return await session_repo.list_sessions(db, limit=limit, cursor=cursor, project=project)
    finally:
        await db.close()

@router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    db = await get_db()
    try:
        session = await session_repo.get_session(db, session_id)
        messages = await message_repo.list_by_session(db, session_id)
        return {"session": session, "messages": messages}
    finally:
        await db.close()
