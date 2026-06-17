import asyncio
import json
from typing import Set
from fastapi import WebSocket
from services.mt5_service import get_tick

_clients: Set[WebSocket] = set()


def add_client(ws: WebSocket):
    _clients.add(ws)


def remove_client(ws: WebSocket):
    _clients.discard(ws)


async def broadcast_loop():
    last_tick = None
    while True:
        try:
            tick = await get_tick()
            if tick and tick != last_tick:
                last_tick = tick
                dead = set()
                msg = json.dumps(tick)
                for ws in list(_clients):
                    try:
                        await ws.send_text(msg)
                    except Exception:
                        dead.add(ws)
                _clients.difference_update(dead)
        except Exception:
            pass
        await asyncio.sleep(0.5)
