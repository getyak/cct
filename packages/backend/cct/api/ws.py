from __future__ import annotations

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from cct.realtime.broadcaster import subscribe, unsubscribe

router = APIRouter()

@router.websocket("/ws/live")
async def ws_live(websocket: WebSocket):
    await websocket.accept()
    q = subscribe()
    try:
        while True:
            msg = await q.get()
            await websocket.send_text(msg)
    except WebSocketDisconnect:
        unsubscribe(q)
