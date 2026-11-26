import asyncio

import pytest

from space_agent.rtc import connect_safely


class FakeRoom:
    def __init__(self):
        self.connected = False
        self.disconnected = False

    async def connect(self, url, token, options):
        await asyncio.sleep(0.2)
        self.connected = True

    async def disconnect(self):
        self.disconnected = True


async def test_cancel_during_connect_waits_then_disconnects():
    room = FakeRoom()
    task = asyncio.create_task(connect_safely(room, "ws://x", "t", None))
    await asyncio.sleep(0.05)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    # 接続は途中で切られず最後まで行われ、そのあとで抜ける
    assert room.connected and room.disconnected


async def test_connect_normally():
    room = FakeRoom()
    await connect_safely(room, "ws://x", "t", None)
    assert room.connected and not room.disconnected
