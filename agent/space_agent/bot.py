"""botたん（BOT-01〜06）。convo の会話に「名前: 発話」の文字を送り、返事の声を LiveKit に流す。"""
from __future__ import annotations

import asyncio
import json
from typing import Callable

import aiohttp
from livekit import rtc

from . import protocol
from .convo import ConvoClient
from .rtc import connect_safely

TTS_RATE = 24000
FRAME_SAMPLES = TTS_RATE // 50  # 20ms


class BotWorker:
    def __init__(self, space_id: str, kind: str, livekit_url: str, token: str, convo: ConvoClient,
                 log: Callable[[str], None]) -> None:
        self.space_id, self.kind, self.livekit_url, self.token = space_id, kind, livekit_url, token
        self.convo, self.log = convo, log
        self.room = rtc.Room()
        self.source = rtc.AudioSource(TTS_RATE, 1)
        self.sid: str | None = None
        self.ws: aiohttp.ClientWebSocketResponse | None = None
        self.reader: asyncio.Task | None = None
        self.failed = False
        self.closed = False

    async def start(self) -> None:
        # パブリックSpace は何人かで話す場、botたんSpace は二人きりの場（convo の使い方）
        self.sid = await self.convo.create_session("space_bot" if self.kind == "bot" else "space", self.space_id)
        self.ws = await self.convo.conversation(self.sid)
        await connect_safely(self.room, self.livekit_url, self.token, rtc.RoomOptions(auto_subscribe=False))
        track = rtc.LocalAudioTrack.create_audio_track("bot-tan", self.source)
        await self.room.local_participant.publish_track(
            track, rtc.TrackPublishOptions(source=rtc.TrackSource.SOURCE_MICROPHONE))
        self.reader = asyncio.create_task(self._read())
        self.log("botたんが参加した")

    async def hear(self, name: str, text: str) -> None:
        """スピーカーの発話を、名前付きの文字で botたんに渡す（BOT-03）。"""
        if self.ws is not None and not self.ws.closed:
            await self.ws.send_str(json.dumps({"type": "input.text", "text": f"{name}: {text}"}, ensure_ascii=False))

    async def interrupt(self) -> None:
        """人間が話し始めたら、botたんは話すのをやめる（BOT-04）。"""
        if self.ws is not None and not self.ws.closed:
            await self.ws.send_str(json.dumps({"type": "control", "action": "interrupt"}))

    async def _publish(self, payload: bytes, topic: str) -> None:
        await self.room.local_participant.publish_data(payload, reliable=True, topic=topic)

    async def _read(self) -> None:
        assert self.ws is not None
        try:
            async for msg in self.ws:
                if msg.type == aiohttp.WSMsgType.BINARY:
                    parsed = protocol.parse_audio_out(msg.data)
                    if parsed:
                        await self._play(parsed[1])
                elif msg.type == aiohttp.WSMsgType.TEXT:
                    await self._event(json.loads(msg.data))
                elif msg.type in (aiohttp.WSMsgType.ERROR, aiohttp.WSMsgType.CLOSED):
                    break
        except Exception as e:  # convo との接続の失敗は、botたんの退出として扱う（BOT-06）
            self.log(f"⚠ botたんの会話が切れた: {type(e).__name__}")
        if not self.closed:
            self.failed = True
            self.log("⚠ convo との接続が切れたので、botたんを退出させる")
            await self.stop()

    async def _play(self, pcm: bytes) -> None:
        step = FRAME_SAMPLES * 2
        for i in range(0, len(pcm) - len(pcm) % 2, step):
            chunk = pcm[i:i + step]
            await self.source.capture_frame(rtc.AudioFrame(chunk, TTS_RATE, 1, len(chunk) // 2))

    async def _event(self, event: dict) -> None:
        kind = event.get("type")
        if kind == "reply.end":
            # 割り込まれたときは、実際に話したところまでを字幕にする（TRANS-01）
            text = (event.get("heard_text") if event.get("interrupted") else event.get("text")) or ""
            if text.strip():
                await self._publish(protocol.caption(protocol.BOT_IDENTITY, "botたん", text.strip()),
                                    protocol.CAPTION_TOPIC)
        elif kind == "audio.flush":
            self.source.clear_queue()
            await self._publish(protocol.bot_event("flush"), protocol.BOT_TOPIC)
        elif kind == "motion" and isinstance(event.get("category"), str):
            await self._publish(protocol.bot_event("motion", category=event["category"]), protocol.BOT_TOPIC)
        elif kind == "state":
            await self._publish(protocol.bot_event("state", phase=event.get("phase")), protocol.BOT_TOPIC)

    async def stop(self) -> None:
        if self.closed:
            return
        self.closed = True
        if self.reader is not None and self.reader is not asyncio.current_task():
            self.reader.cancel()
        if self.ws is not None:
            await self.ws.close()
        if self.sid is not None:
            try:
                await self.convo.delete_session(self.sid)
            except Exception as e:
                self.log(f"⚠ convo の会話を閉じられない: {type(e).__name__}")
        await self.room.disconnect()
        self.log("botたんが退出した")
