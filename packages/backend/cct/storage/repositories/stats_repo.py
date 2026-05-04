from __future__ import annotations
import aiosqlite
from cct.models.api import StatsIntentDTO, StatsTokenDTO

async def intent_distribution(db: aiosqlite.Connection,
                               from_ts=None, to_ts=None) -> list[StatsIntentDTO]:
    where, params = ["1=1"], []
    if from_ts:
        where.append("m.created_at >= ?"); params.append(from_ts)
    if to_ts:
        where.append("m.created_at <= ?"); params.append(to_ts)
    sql = f"""
        SELECT i.primary_intent AS intent, COUNT(*) AS cnt
        FROM intents i JOIN messages m ON m.id=i.message_id
        WHERE {" AND ".join(where)}
        GROUP BY i.primary_intent ORDER BY cnt DESC
    """
    async with db.execute(sql, params) as cur:
        rows = await cur.fetchall()
    total = sum(r["cnt"] for r in rows) or 1
    return [StatsIntentDTO(
        intent=r["intent"], count=r["cnt"],
        percentage=round(r["cnt"]/total*100, 1)
    ) for r in rows]

async def token_usage(db: aiosqlite.Connection,
                      from_ts=None, to_ts=None, bucket="day") -> list[StatsTokenDTO]:
    fmt = "%Y-%m-%d" if bucket == "day" else "%Y-%m-%dT%H"
    where, params = ["role='assistant'"], []
    if from_ts:
        where.append("created_at >= ?"); params.append(from_ts)
    if to_ts:
        where.append("created_at <= ?"); params.append(to_ts)
    sql = f"""
        SELECT strftime('{fmt}', created_at/1000, 'unixepoch') AS bucket,
               SUM(input_tokens) AS input_tokens,
               SUM(output_tokens) AS output_tokens
        FROM messages WHERE {" AND ".join(where)}
        GROUP BY bucket ORDER BY bucket
    """
    async with db.execute(sql, params) as cur:
        rows = await cur.fetchall()
    return [StatsTokenDTO(
        bucket=r["bucket"],
        input_tokens=r["input_tokens"] or 0,
        output_tokens=r["output_tokens"] or 0,
    ) for r in rows]
