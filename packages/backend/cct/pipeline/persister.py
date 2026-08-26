from __future__ import annotations

import json
import time

from ulid import ULID

from cct.intent.rules import classify
from cct.realtime.broadcaster import broadcast
from cct.storage import jsonl_writer
from cct.storage.db import get_db
from cct.storage.repositories import message_repo, session_repo


def _new_id() -> str:
    return str(ULID())

async def handle(event: dict) -> None:
    raw_ref = await jsonl_writer.append(event)
    db = await get_db()
    try:
        et = event.get("event_type")
        ts = event.get("timestamp", int(time.time() * 1000))
        sid = event.get("session_id") or _new_id()

        tok = event.get("tokens") or {}
        has_content = et in ("user_prompt", "assistant_reply") and bool(event.get("content"))
        await session_repo.upsert(db, {
            "id": sid,
            "source": event.get("source", "http_api"),
            "project_path": event.get("project_path"),
            "project_name": event.get("project_name"),
            "started_at": ts,
            "metadata": json.dumps(event.get("metadata", {})),
            "msg_delta": 1 if has_content else 0,
            "total_input_tokens": tok.get("input", 0),
            "total_output_tokens": tok.get("output", 0),
        })

        if et in ("user_prompt", "assistant_reply") and event.get("content"):
            mid = _new_id()
            tok = event.get("tokens") or {}
            await message_repo.insert(db, {
                "id": mid,
                "session_id": sid,
                "role": event.get("role") or ("user" if et == "user_prompt" else "assistant"),
                "content": event["content"],
                "created_at": ts,
                "input_tokens": tok.get("input"),
                "output_tokens": tok.get("output"),
                "model": event.get("model"),
                "raw_event_ref": raw_ref,
            })

            if et == "user_prompt":
                intent = classify(event["content"])
                await db.execute("""
                    INSERT OR REPLACE INTO intents
                    (message_id,primary_intent,secondary_intents,confidence,classifier,keywords,summary,classified_at)
                    VALUES(?,?,?,?,?,?,?,?)
                """, (mid, intent.primary, json.dumps(intent.secondary),
                      intent.confidence, intent.classifier,
                      json.dumps(intent.keywords), intent.summary, ts))
                await db.commit()

            await broadcast({"type": "message.created", "data": {
                "id": mid, "session_id": sid, "role": event.get("role"),
                "content_preview": event["content"][:120],
                "created_at": ts,
            }})
    finally:
        await db.close()
