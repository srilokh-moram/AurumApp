from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from services.price_feed import add_client, remove_client
from services.mt5_service import get_candles, get_tick, get_live_profits
import json

router = APIRouter(tags=["market"])


@router.get("/market/candles")
async def candles(count: int = 300):
    data = await get_candles(count)
    return data


@router.get("/market/tick")
async def tick():
    data = await get_tick()
    return data


@router.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    await websocket.accept()

    # Send current tick + live positions immediately on connect
    tick = await get_tick()
    live = await get_live_profits()
    if tick:
        await websocket.send_text(json.dumps({**tick, "positions": live}))

    add_client(websocket)
    try:
        while True:
            # Keep connection alive — client may send pings
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        remove_client(websocket)
