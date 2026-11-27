"""字幕（TRANS-01〜04）。スピーカーごとの声を convo の字幕だけのつなぎへ送り、確定した字幕を Space に配る。

発話の中身はログに出さない（TRANS-04）。
"""
from __future__ import annotations

import asyncio
import json
from typing import Awaitable, Callable

import aiohttp
from livekit import rtc

from . import protocol
from .barge import BargeGate
from .convo import ConvoClient
from .rtc import connect_safely

ASR_RATE = 16000
SPEAKING_ROLES = ("host", "speaker")


class CaptionsWorker:
    def __init__(self, space_id: str, livekit_url: str, token: str | None, convo: ConvoClient,
                 log: Callable[[str], None], room: rtc.Room | None = None) -> None:
        self.space_id, self.livekit_url, self.token, self.convo, self.log = space_id, livekit_url, token, convo, log
        # botたんSpace では botたんの接続を共用する（自分では接続も切断もしない。simplify-bot-space D2）
        self.shared = room is not None
        self.room = room or rtc.Room()
        self.ws: aiohttp.ClientWebSocketResponse | None = None
        self.streams: dict[str, asyncio.Task] = {}
        self.tasks: set[asyncio.Task] = set()
        self.reader: asyncio.Task | None = None
        # botたんへ渡す口（botたんが参加しているときだけ space.py が入れる）
        self.on_transcript: Callable[[str, str], Awaitable[None]] | None = None
        self.barge: BargeGate | None = None  # 割り込みの二段構え（botたんが参加しているときだけ。BOT-04）
        self.closed = False

    async def start(self) -> None:
        self.ws = await self.convo.transcribe()
        self.room.on("track_published", self._on_published)
        self.room.on("track_subscribed", self._on_subscribed)
        self.room.on("participant_metadata_changed", self._on_metadata)
        self.room.on("participant_disconnected", lambda p: self._spawn(self._leave(p.identity)))
        if not self.shared:
            await connect_safely(self.room, self.livekit_url, self.token, rtc.RoomOptions(auto_subscribe=False))
        for participant in self.room.remote_participants.values():
            for publication in participant.track_publications.values():
                self._on_published(publication, participant)
        self.reader = asyncio.create_task(self._read())
        self.log("字幕を始めた")

    def _spawn(self, coro) -> None:
        task = asyncio.create_task(coro)
        self.tasks.add(task)
        task.add_done_callback(self.tasks.discard)

    def _is_speaker(self, participant: rtc.RemoteParticipant) -> bool:
        return protocol.role_of(participant.metadata) in SPEAKING_ROLES

    def _on_published(self, publication: rtc.RemoteTrackPublication, participant: rtc.RemoteParticipant) -> None:
        # 聞き取るのはホストとスピーカーの声だけ（聴衆は送れない。PART-01）
        if publication.kind == rtc.TrackKind.KIND_AUDIO and self._is_speaker(participant):
            publication.set_subscribed(True)

    def _on_metadata(self, participant: rtc.Participant, _old: str, _new: str) -> None:
        if not isinstance(participant, rtc.RemoteParticipant):
            return
        if self._is_speaker(participant):
            for publication in participant.track_publications.values():
                self._on_published(publication, participant)
        else:
            for publication in participant.track_publications.values():
                if publication.kind == rtc.TrackKind.KIND_AUDIO:
                    publication.set_subscribed(False)
            self._spawn(self._leave(participant.identity))

    def _on_subscribed(self, track: rtc.Track, _pub, participant: rtc.RemoteParticipant) -> None:
        if track.kind != rtc.TrackKind.KIND_AUDIO:
            return
        old = self.streams.pop(participant.identity, None)
        if old:
            old.cancel()
        self.streams[participant.identity] = asyncio.create_task(self._pump(participant.identity, track))

    async def _pump(self, speaker: str, track: rtc.Track) -> None:
        stream = rtc.AudioStream(track, sample_rate=ASR_RATE, num_channels=1)
        try:
            async for event in stream:
                if self.ws is None or self.ws.closed:
                    break
                await self.ws.send_bytes(protocol.speaker_frame(speaker, bytes(event.frame.data)))
        finally:
            await stream.aclose()

    async def _leave(self, speaker: str) -> None:
        task = self.streams.pop(speaker, None)
        if task:
            task.cancel()
        if self.ws is not None and not self.ws.closed:
            await self.ws.send_str(json.dumps({"type": "speaker.leave", "speaker": speaker}))

    def _name(self, identity: str) -> str:
        participant = self.room.remote_participants.get(identity)
        return (participant.name if participant and participant.name else identity)

    async def _read(self) -> None:
        assert self.ws is not None
        try:
            async for msg in self.ws:
                if msg.type != aiohttp.WSMsgType.TEXT:
                    if msg.type in (aiohttp.WSMsgType.ERROR, aiohttp.WSMsgType.CLOSED):
                        break
                    continue
                event = json.loads(msg.data)
                kind = event.get("type")
                if kind == "transcript" and isinstance(event.get("speaker"), str):
                    name = self._name(event["speaker"])
                    await self.room.local_participant.publish_data(
                        protocol.caption(event["speaker"], name, event.get("text", "")),
                        reliable=True, topic=protocol.CAPTION_TOPIC)
                    if self.on_transcript:
                        await self.on_transcript(name, event.get("text", ""))
                elif kind in ("speech.start", "speech.confirmed", "speech.end") and self.barge \
                        and isinstance(event.get("speaker"), str):
                    gate, speaker = self.barge, event["speaker"]
                    await (gate.start(speaker) if kind == "speech.start" else
                           gate.confirmed(speaker) if kind == "speech.confirmed" else gate.end(speaker))
                elif kind in ("captions.paused", "captions.resumed"):
                    await self.room.local_participant.publish_data(
                        protocol.captions_state(kind == "captions.paused"), reliable=True,
                        topic=protocol.CAPTION_TOPIC)
        except Exception as e:
            self.log(f"⚠ 字幕のつなぎが切れた: {type(e).__name__}")
        if not self.closed:
            # 字幕が止まったことを画面に知らせる（人間どうしの会話は続く。BOT-06）
            try:
                await self.room.local_participant.publish_data(
                    protocol.captions_state(True), reliable=True, topic=protocol.CAPTION_TOPIC)
            except Exception:
                pass
            await self.stop()

    async def stop(self) -> None:
        if self.closed:
            return
        self.closed = True
        for task in list(self.streams.values()) + list(self.tasks):
            task.cancel()
        if self.reader is not None and self.reader is not asyncio.current_task():
            self.reader.cancel()
        if self.ws is not None:
            await self.ws.close()
        if not self.shared:
            await self.room.disconnect()
        self.log("字幕を止めた")
