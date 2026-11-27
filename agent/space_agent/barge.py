"""割り込みの二段構え（BOT-04）。botたんの返事の途中で声がしたらいったん止め、声が1秒続いたら止め、
続かなければ続きを話させる。1秒の判断は convo の字幕だけのつなぎ（speech.confirmed）が行う。
"""
from __future__ import annotations

from typing import Awaitable, Callable

Action = Callable[[], Awaitable[None]]


class BargeGate:
    def __init__(self, pause: Action, interrupt: Action, resume: Action) -> None:
        self.pause, self.interrupt, self.resume = pause, interrupt, resume
        self.pending: set[str] = set()  # 声がして、まだ確定も終わりもしていない話者

    async def start(self, speaker: str) -> None:
        first = not self.pending
        self.pending.add(speaker)
        if first:
            await self.pause()

    async def confirmed(self, speaker: str) -> None:
        if speaker in self.pending:
            self.pending.clear()
            await self.interrupt()

    async def end(self, speaker: str) -> None:
        if speaker not in self.pending:
            return
        self.pending.discard(speaker)
        # 何人かが同時に話したときは、確定していない人が全員終わってから続ける
        if not self.pending:
            await self.resume()
