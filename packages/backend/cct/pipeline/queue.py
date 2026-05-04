from __future__ import annotations
import asyncio
from typing import Callable, Awaitable

_queue: asyncio.Queue = asyncio.Queue(maxsize=2000)

async def enqueue(event: dict) -> None:
    await _queue.put(event)

async def worker(handler: Callable[[dict], Awaitable[None]]) -> None:
    while True:
        event = await _queue.get()
        try:
            await handler(event)
        except Exception as e:
            print(f"[pipeline] error: {e}")
        finally:
            _queue.task_done()
