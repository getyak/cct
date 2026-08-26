from __future__ import annotations

import asyncio
import json

_subscribers: set[asyncio.Queue] = set()

def subscribe() -> asyncio.Queue:
    q: asyncio.Queue = asyncio.Queue(maxsize=200)
    _subscribers.add(q)
    return q

def unsubscribe(q: asyncio.Queue) -> None:
    _subscribers.discard(q)

async def broadcast(event: dict) -> None:
    msg = json.dumps(event)
    dead = set()
    for q in _subscribers:
        try:
            q.put_nowait(msg)
        except asyncio.QueueFull:
            dead.add(q)
    _subscribers.difference_update(dead)
