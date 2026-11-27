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
        # パブリックSpace は字幕用の参加者が常に入る。botたんSpace は botたんが参加している間だけ、
        # botたんの接続で字幕も受け持つ（TRANS-01・BOT-06、simplify-bot-space D2）
        self.solo = self.kind == "bot"
        self.captions: CaptionsWorker | None = None if self.solo else \
            CaptionsWorker(self.id, livekit_url, job["captionsToken"], convo, self.log)
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
            if self.captions is not None:
                await self.captions.start()
            while not self.dead and (self.captions is None or not self.captions.closed):
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
        return not self.dead and (self.solo or (self.captions is not None and not self.captions.closed))

    async def want_bot(self, token: str | None) -> None:
        """botたんを頼まれているか（token あり）に合わせて、参加・退出させる。"""
        if self.bot is not None and self.bot.closed:
            if self.bot.failed:
                self.bot_failed_at = time.monotonic()
            await self._drop_bot()
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
            if self.solo:
                self.captions = CaptionsWorker(self.id, self.livekit_url, None, self.convo, self.log, room=bot.room)
                try:
                    await self.captions.start()
                except Exception as e:
                    self.log(f"⚠ 字幕を始められない: {type(e).__name__}: {e}")
                    await self._drop_bot(stop=True)
                    self.bot_failed_at = time.monotonic()
                    return
            self._wire(bot)
        elif not token and self.bot is not None:
            await self._drop_bot(stop=True)

    async def _drop_bot(self, stop: bool = False) -> None:
        """botたんを外す。botたんSpace では同じ接続の字幕も止める。"""
        bot, self.bot = self.bot, None
        if self.solo and self.captions is not None:
            await self.captions.stop()
            self.captions = None
        else:
            self._wire(None)
        if stop and bot is not None:
            await bot.stop()

    def _wire(self, bot: BotWorker | None) -> None:
        if self.captions is None:
            return
        self.captions.on_transcript = bot.hear if bot else None
        self.captions.on_speech_start = bot.interrupt if bot else None

    async def stop(self) -> None:
        if self.task is not None and self.task is not asyncio.current_task():
            self.task.cancel()
            with contextlib.suppress(BaseException):
                await self.task
        if self.bot is not None:
            await self._drop_bot(stop=True)
        if self.captions is not None:
            await self.captions.stop()
