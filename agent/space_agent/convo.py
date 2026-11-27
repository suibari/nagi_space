"""bot-tan-convo との通信（API v1 と、Nagi Space 向けの字幕だけのつなぎ）。convo の docs/nagi-space.md。"""
from __future__ import annotations

import json
from dataclasses import dataclass

import aiohttp


@dataclass
class Capacity:
    bot_free: int
    bot_max: int
    captions_free: int
    captions_max: int


class ConvoClient:
    def __init__(self, session: aiohttp.ClientSession, url: str, login: str, confirm_ms: int = 1000) -> None:
        self.http = session
        self.url = url
        self.confirm_ms = confirm_ms
        # convo は tailscale serve が付けるヘッダで利用者を確かめる。同じマシンから直接つなぐので自分で付ける
        self.headers = {"Tailscale-User-Login": login}

    async def capacity(self) -> Capacity:
        async with self.http.get(f"{self.url}/v1/health", headers=self.headers,
                                 timeout=aiohttp.ClientTimeout(total=5)) as r:
            r.raise_for_status()
            h = await r.json()
        return Capacity(bot_free=max(0, h["max_sessions"] - h["sessions"]), bot_max=h["max_sessions"],
                        captions_free=max(0, h["max_transcribe"] - h["transcribers"]),
                        captions_max=h["max_transcribe"])

    async def create_session(self, profile: str, key: str, context: str = "") -> str:
        body = {"profile": profile, "key": key, **({"context": context} if context else {})}
        async with self.http.post(f"{self.url}/v1/sessions", json=body,
                                  headers=self.headers) as r:
            if r.status not in (200, 201):
                raise RuntimeError(f"convo の会話を作れない（{r.status}）")
            return (await r.json())["session_id"]

    async def delete_session(self, sid: str) -> None:
        async with self.http.delete(f"{self.url}/v1/sessions/{sid}", headers=self.headers) as r:
            if r.status not in (204, 404):
                raise RuntimeError(f"convo の会話を閉じられない（{r.status}）")

    async def conversation(self, sid: str) -> aiohttp.ClientWebSocketResponse:
        """botたんの会話。文字（input.text）を送り、返事の声とできごとを受け取る。"""
        ws = await self.http.ws_connect(f"{self.url.replace('http', 'ws', 1)}/v1/sessions/{sid}/ws",
                                        headers=self.headers, heartbeat=20)
        await ws.send_str(json.dumps({"type": "hello", "v": 1, "roles": ["participant", "viewer"],
                                      "audio_in": {"rate": 16000}}))
        return ws

    async def transcribe(self) -> aiohttp.ClientWebSocketResponse:
        """字幕だけのつなぎ。話者ごとの声を送り、話し始めと文字起こしを受け取る。"""
        ws = await self.http.ws_connect(f"{self.url.replace('http', 'ws', 1)}/v1/transcribe/ws",
                                        headers=self.headers, heartbeat=20)
        await ws.send_str(json.dumps({"type": "hello", "v": 1, "audio_in": {"rate": 16000},
                                      "confirm_ms": self.confirm_ms}))
        return ws
