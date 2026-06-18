from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.price_feed import add_client, remove_client
from services.mt5_service import get_candles, get_tick, get_live_profits
from config import SYMBOL, SYMBOL_SILVER
import json

router = APIRouter(tags=["market"])


@router.get("/market/candles")
async def candles(count: int = 200, timeframe: str = "M1", symbol: str = SYMBOL):
    data = await get_candles(count, timeframe, symbol)
    return data


@router.get("/market/tick")
async def tick(symbol: str = SYMBOL):
    data = await get_tick(symbol)
    return data


@router.websocket("/ws/prices")
async def websocket_prices(websocket: WebSocket):
    await websocket.accept()

    # Send current ticks + live positions immediately on connect
    gold_tick = await get_tick(SYMBOL)
    silver_tick = await get_tick(SYMBOL_SILVER)
    live = await get_live_profits()
    await websocket.send_text(json.dumps({"gold": gold_tick, "silver": silver_tick, "positions": live}))

    add_client(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        remove_client(websocket)
