from __future__ import annotations
import aiosqlite
from pathlib import Path
from cct.config import db_path

_SCHEMA = Path(__file__).parent / "schema.sql"

async def get_db() -> aiosqlite.Connection:
    db = await aiosqlite.connect(db_path())
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    return db

async def init_db() -> None:
    sql = _SCHEMA.read_text()
    async with aiosqlite.connect(db_path()) as db:
        db.row_factory = aiosqlite.Row
        await db.executescript(sql)
        await db.commit()
