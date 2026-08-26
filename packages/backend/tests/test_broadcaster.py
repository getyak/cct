import json

import pytest

from cct.realtime.broadcaster import broadcast, subscribe, unsubscribe


@pytest.mark.asyncio
async def test_broadcast_delivers_serialized_event():
    queue = subscribe()
    try:
        await broadcast({"status": "ok"})
        assert json.loads(queue.get_nowait()) == {"status": "ok"}
    finally:
        unsubscribe(queue)
