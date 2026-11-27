"""1 つの Space の受け持ち（字幕と、頼まれたときの botたん）。

同期の流れを止めないよう、Space ごとのタスクが「望む状態」（botたんの有無）に合わせて裏で動かす。
"""
from __future__ import annotations

import asyncio
import contextlib
import time
from typing import Awaitable, Callable

from .bot import BotWorker
from .captions import CaptionsWorker
from .convo import ConvoClient

BOT_RETRY_AFTER_S = 30.0  # botたんの接続に失敗したら、しばらくは入り直さない（BOT-06）


class SpaceWorker:
    def __init__(self, job: dict, livekit_url: str, convo: ConvoClient, log: Callable[[str], None],
                 context: Callable[[str], Awaitable[str]] | None = None) -> None:
        self.id = job["spaceId"]
        self.kind = job["kind"]
        self.livekit_url = livekit_url
        self.convo = convo
        self.context = context
        self.log = lambda m: log(f"[{self.id}] {m}")
        self.captions = CaptionsWorker(self.id, livekit_url, job["captionsToken"], convo, self.log)
        self.bot: BotWorker | None = None
        self.bot_failed_at = 0.0
        self.desired_bot: str | None = None
        self.changed = asyncio.Event()
        self.task: asyncio.Task | None = None
        self.dead = False

    def launch(self) -> None:
        """裏で字幕を始め、その後は望む状態に合わせ続ける。"""
        self.task = asyncio.create_task(self._run())

    def desire(self, bot_token: str | None) -> None:
        if bot_token != self.desired_bot:
            self.desired_bot = bot_token
            self.changed.set()

    async def _run(self) -> None:
        try:
            await self.captions.start()
            while not self.captions.closed:
                await self.want_bot(self.desired_bot)
                self.changed.clear()
                # 望む状態が変わるか、botたんの失敗後に入り直せるようになるまで待つ
                with contextlib.suppress(asyncio.TimeoutError):
                    await asyncio.wait_for(self.changed.wait(), timeout=5)
        except asyncio.CancelledError:
            raise
        except Exception as e:
            self.log(f"⚠ 受け持てない: {type(e).__name__}: {e}")
        finally:
            self.dead = True

    @property
    def alive(self) -> bool:
        return not self.dead and not self.captions.closed

    async def want_bot(self, token: str | None) -> None:
        """botたんを頼まれているか（token あり）に合わせて、参加・退出させる。"""
        if self.bot is not None and self.bot.closed:
            if self.bot.failed:
                self.bot_failed_at = time.monotonic()
            self.bot = None
            self._wire(None)
        if token and self.bot is None and time.monotonic() - self.bot_failed_at >= BOT_RETRY_AFTER_S:
            bot = BotWorker(self.id, self.kind, self.livekit_url, token, self.convo, self.log, self.context)
            try:
                await bot.start()
            except Exception as e:
                self.log(f"⚠ botたんを参加させられない: {type(e).__name__}: {e}")
                self.bot_failed_at = time.monotonic()
                await bot.stop()
                return
            self.bot = bot
            self._wire(bot)
        elif not token and self.bot is not None:
            await self.bot.stop()
            self.bot = None
            self._wire(None)

    def _wire(self, bot: BotWorker | None) -> None:
        self.captions.on_transcript = bot.hear if bot else None
        self.captions.on_speech_start = bot.interrupt if bot else None

    async def stop(self) -> None:
        if self.task is not None and self.task is not asyncio.current_task():
            self.task.cancel()
            with contextlib.suppress(BaseException):
                await self.task
        if self.bot is not None:
            await self.bot.stop()
        await self.captions.stop()
