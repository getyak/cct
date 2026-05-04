from __future__ import annotations
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from cct.storage.db import init_db
from cct.pipeline.queue import worker
from cct.pipeline.persister import handle
from cct.api import ingest, sessions, search, stats, ws

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    task = asyncio.create_task(worker(handle))
    yield
    task.cancel()

app = FastAPI(title="Claude Conversation Tracker", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

for r in [ingest.router, sessions.router, search.router, stats.router, ws.router]:
    app.include_router(r)

@app.get("/healthz")
async def health():
    return {"status": "ok"}
