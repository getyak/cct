from __future__ import annotations

import json

import aiosqlite

from cct.models.api import SessionDTO


async def upsert(db: aiosqlite.Connection, s: dict) -> None:
    # msg_delta=1 on first insert; ON CONFLICT accumulates counts correctly
    row = {**s, "msg_delta": s.get("msg_delta", 1)}
    await db.execute("""
        INSERT INTO sessions(id,source,project_path,project_name,started_at,metadata,
            message_count,total_input_tokens,total_output_tokens)
        VALUES(:id,:source,:project_path,:project_name,:started_at,:metadata,
            :msg_delta,:total_input_tokens,:total_output_tokens)
        ON CONFLICT(id) DO UPDATE SET
            message_count=message_count+excluded.message_count,
            total_input_tokens=total_input_tokens+excluded.total_input_tokens,
            total_output_tokens=total_output_tokens+excluded.total_output_tokens
    """, row)
    await db.commit()

_TITLE_SQL = """
    (SELECT substr(m.content, 1, 80)
     FROM messages m
     WHERE m.session_id = s.id AND m.role = 'user'
     ORDER BY m.created_at ASC LIMIT 1) AS title
"""

async def list_sessions(db: aiosqlite.Connection, limit=50, cursor=None,
                        project=None, intent=None) -> list[SessionDTO]:
    where, params = ["1=1"], {}
    if cursor:
        where.append("s.started_at < :cursor")
        params["cursor"] = cursor
    if project:
        where.append("s.project_path LIKE :project")
        params["project"] = f"%{project}%"
    sql = f"""
        SELECT s.*, {_TITLE_SQL}
        FROM sessions s
        WHERE {" AND ".join(where)}
        ORDER BY s.started_at DESC LIMIT :limit
    """
    params["limit"] = limit
    async with db.execute(sql, params) as cur:
        rows = await cur.fetchall()
    return [_to_dto(r) for r in rows]

async def get_session(db: aiosqlite.Connection, sid: str) -> SessionDTO | None:
    sql = f"SELECT s.*, {_TITLE_SQL} FROM sessions s WHERE s.id=?"
    async with db.execute(sql, (sid,)) as cur:
        row = await cur.fetchone()
    return _to_dto(row) if row else None

def _to_dto(r) -> SessionDTO:
    meta = json.loads(r["metadata"]) if r["metadata"] else None
    keys = r.keys() if hasattr(r, "keys") else []
    title = r["title"] if "title" in keys else None
    return SessionDTO(
        id=r["id"], source=r["source"],
        project_path=r["project_path"], project_name=r["project_name"],
        title=title,
        started_at=r["started_at"], ended_at=r["ended_at"],
        message_count=r["message_count"],
        total_input_tokens=r["total_input_tokens"],
        total_output_tokens=r["total_output_tokens"],
        metadata=meta,
    )
