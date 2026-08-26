from __future__ import annotations

import json

import aiosqlite

from cct.models.api import MessageDTO, SearchResult


async def insert(db: aiosqlite.Connection, m: dict) -> None:
    await db.execute("""
        INSERT INTO messages(id,session_id,role,content,created_at,
            input_tokens,output_tokens,model,raw_event_ref)
        VALUES(:id,:session_id,:role,:content,:created_at,
            :input_tokens,:output_tokens,:model,:raw_event_ref)
    """, m)
    await db.commit()

async def list_by_session(db: aiosqlite.Connection, sid: str) -> list[MessageDTO]:
    sql = """
        SELECT m.*, i.primary_intent, i.confidence, i.keywords, i.summary
        FROM messages m LEFT JOIN intents i ON i.message_id=m.id
        WHERE m.session_id=? ORDER BY m.created_at
    """
    async with db.execute(sql, (sid,)) as cur:
        rows = await cur.fetchall()
    return [_to_dto(r) for r in rows]

async def search(db: aiosqlite.Connection, q: str, limit=20) -> list[SearchResult]:
    # FTS5 with prefix match (works well for latin/space-separated terms)
    fts_sql = """
        SELECT m.id, m.session_id, m.role, m.created_at,
               snippet(messages_fts, 0, '<b>', '</b>', '…', 24) AS snippet,
               i.primary_intent
        FROM messages_fts fts
        JOIN messages m ON m.rowid = fts.rowid
        LEFT JOIN intents i ON i.message_id = m.id
        WHERE messages_fts MATCH ?
        ORDER BY rank LIMIT ?
    """
    # LIKE fallback covers Chinese substrings that FTS tokenizer may miss
    like_sql = """
        SELECT m.id, m.session_id, m.role, m.created_at,
               substr(m.content, 1, 120) AS snippet,
               i.primary_intent
        FROM messages m
        LEFT JOIN intents i ON i.message_id = m.id
        WHERE m.content LIKE ?
        ORDER BY m.created_at DESC LIMIT ?
    """
    rows: list = []
    try:
        async with db.execute(fts_sql, (q + "*", limit)) as cur:
            rows = list(await cur.fetchall())
    except Exception:
        pass

    if not rows:
        async with db.execute(like_sql, (f"%{q}%", limit)) as cur:
            rows = list(await cur.fetchall())

    return [
        SearchResult(
            message_id=r["id"],
            session_id=r["session_id"],
            role=r["role"],
            snippet=r["snippet"] or "",
            created_at=r["created_at"],
            primary_intent=r["primary_intent"],
        )
        for r in rows
    ]

def _to_dto(r) -> MessageDTO:
    intent = None
    if r["primary_intent"]:
        intent = {
            "primary": r["primary_intent"],
            "confidence": r["confidence"],
            "keywords": json.loads(r["keywords"]) if r["keywords"] else [],
            "summary": r["summary"],
        }
    return MessageDTO(
        id=r["id"], session_id=r["session_id"], role=r["role"],
        content=r["content"], created_at=r["created_at"],
        input_tokens=r["input_tokens"], output_tokens=r["output_tokens"],
        model=r["model"], intent=intent,
    )
