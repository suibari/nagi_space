"""LiveKit の room への出入り。"""
from __future__ import annotations

import asyncio
import contextlib

from livekit import rtc


async def connect_safely(room: rtc.Room, url: str, token: str, options: rtc.RoomOptions) -> None:
    """room につなぐ。つないでいる途中で取り消されても、つなぎ終わるのを待ってから抜ける。

    LiveKit の Python SDK は、接続の途中で待ちを取り消すと、中の部品（FFI）が「接続後の準備」を
    待ったまま時間切れになり、プロセスごと落ちる（2026-11-27、livekit 1.2.2 で確認）。
    """
    connect = asyncio.ensure_future(room.connect(url, token, options))
    try:
        await asyncio.shield(connect)
    except asyncio.CancelledError:
        with contextlib.suppress(Exception):
            await connect
        with contextlib.suppress(Exception):
            await room.disconnect()
        raise
