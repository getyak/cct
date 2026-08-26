from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from cct.api import ingest, search, sessions, stats, ws
from cct.pipeline.persister import handle
from cct.pipeline.queue import worker
from cct.storage.db import init_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    task = asyncio.create_task(worker(handle))
    yield
    task.cancel()
    with suppress(asyncio.CancelledError):
        await task

app = FastAPI(title="Claude Conversation Tracker", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

for r in [ingest.router, sessions.router, search.router, stats.router, ws.router]:
    app.include_router(r)

@app.get("/healthz")
async def health():
    return {"status": "ok"}
