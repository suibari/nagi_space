"""E2E 専用の偽の bot-tan-convo（space-agent が使う口だけ）。本物は GPU と人物設定が要るため。

- /v1/transcribe/ws：話者ごとの声を数え、音のあった1秒ごとに speech.start・speech.confirmed・文字起こし・
  speech.end を返す（1秒続いた声として扱う。割り込みの二段構え BOT-04）
  （Chrome の偽のマイクは1秒ごとに短く鳴るだけなので、無音の部分も含めて数える）
- /v1/sessions/{sid}/ws：文字（input.text）を受けたら、短い返事の声と動きと字幕を返す
- POST /test/capacity：botたんの空きを変える（会話が増えても減っても、空きはこの数のまま）。
  `down: true` なら /v1/health を 503 にして、convo が止まった状態を再現する
"""
from __future__ import annotations

import json
import math
import os
import secrets
import struct

from aiohttp import WSMsgType, web

PORT = int(os.environ.get("PORT", "8799"))
state = {"down": False, "free": 2, "sessions": {}, "transcribers": 0, "last_text": {}, "conversations": set(), "interrupts": 0, "pauses": 0, "transcribe_ws": set()}


def tone(seconds: float, rate: int = 24000) -> bytes:
    n = int(rate * seconds)
    return b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * 440 * i / rate))) for i in range(n))


async def health(_r):
    if state["down"]:
        return web.json_response({"error": "down"}, status=503)
    # 本物の convo は上限が 1 以上。上限 0 は「止まっている」とみなされる（BOT-06）ので、空きが 0 でも上限は残す
    max_sessions = max(2, len(state["sessions"]) + state["free"])
    return web.json_response({"status": "ok", "v": 1, "sessions": max_sessions - state["free"],
                              "max_sessions": max_sessions, "transcribers": state["transcribers"],
                              "max_transcribe": 6})


async def create(request):
    body = await request.json()
    key = (body.get("profile"), body.get("key"))
    for sid, k in state["sessions"].items():
        if k == key:
            return web.json_response({"session_id": sid}, status=200)
    if state["free"] <= 0:
        return web.json_response({"error": "busy"}, status=409)
    sid = secrets.token_hex(6)
    state["sessions"][sid] = key
    return web.json_response({"session_id": sid}, status=201)


async def delete(request):
    state["sessions"].pop(request.match_info["sid"], None)
    return web.Response(status=204)


async def conversation(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    state["conversations"].add(ws)
    n = 0
    async for msg in ws:
        if msg.type != WSMsgType.TEXT:
            continue
        data = json.loads(msg.data)
        if data.get("type") == "input.text":
            n += 1
            state["last_text"][request.match_info["sid"]] = data["text"]
            utt = f"r{n}".encode()
            await ws.send_str(json.dumps({"type": "reply.start", "utt": f"r{n}", "text": ""}))
            await ws.send_str(json.dumps({"type": "motion", "utt": f"r{n}", "category": "happy"}))
            await ws.send_bytes(bytes([0x11, len(utt)]) + utt + tone(0.4))
            await ws.send_str(json.dumps({"type": "reply.end", "utt": f"r{n}", "interrupted": False,
                                          "text": "うんうん、すてきだね！"}, ensure_ascii=False))
        elif data.get("type") == "control" and data.get("action") == "pause":
            state["pauses"] += 1
        elif data.get("type") == "control" and data.get("action") == "interrupt":
            state["interrupts"] += 1
            await ws.send_str(json.dumps({"type": "audio.flush", "utt": f"r{n}"}))
    state["conversations"].discard(ws)
    return ws


async def transcribe(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    state["transcribers"] += 1
    state["transcribe_ws"].add(ws)
    counts: dict[str, int] = {}
    heard: dict[str, bool] = {}
    try:
        async for msg in ws:
            if msg.type == WSMsgType.TEXT:
                if json.loads(msg.data).get("type") == "hello":
                    await ws.send_str(json.dumps({"type": "welcome", "v": 1, "mode": "transcribe"}))
                continue
            if msg.type != WSMsgType.BINARY or msg.data[0] != 0x03:
                continue
            n = msg.data[1]
            speaker = msg.data[2:2 + n].decode()
            pcm = msg.data[2 + n:]
            counts[speaker] = counts.get(speaker, 0) + len(pcm)
            heard[speaker] = heard.get(speaker, False) or any(pcm)
            if counts[speaker] >= 32000:  # 1秒分
                counts[speaker] = 0
                if not heard.pop(speaker, False):
                    continue  # 無音だけの1秒（マイクを切っているとき）は文字にしない
                await ws.send_str(json.dumps({"type": "speech.start", "speaker": speaker}))
                await ws.send_str(json.dumps({"type": "speech.confirmed", "speaker": speaker}))
                await ws.send_str(json.dumps({"type": "transcript", "speaker": speaker,
                                              "text": "テストの発話です"}, ensure_ascii=False))
                await ws.send_str(json.dumps({"type": "speech.end", "speaker": speaker}))
    finally:
        state["transcribers"] -= 1
        state["transcribe_ws"].discard(ws)
    return ws


async def set_capacity(request):
    body = await request.json()
    state["free"] = int(body["bot"])
    state["down"] = bool(body.get("down", False))
    return web.json_response({"ok": True})


async def drop(_request):
    """botたんの会話の接続を切る（convo の障害の再現。BOT-06）。"""
    for ws in list(state["conversations"]):
        await ws.close()
    state["sessions"].clear()
    return web.json_response({"ok": True})


async def last_text(request):
    return web.json_response({"texts": list(state["last_text"].values()), "interrupts": state["interrupts"],
                              "pauses": state["pauses"]})


async def pause(request):
    """字幕の一時停止・再開を知らせる（混雑の再現。TRANS-03）。"""
    kind = "captions.paused" if (await request.json()).get("paused") else "captions.resumed"
    for ws in list(state["transcribe_ws"]):
        await ws.send_str(json.dumps({"type": kind}))
    return web.json_response({"ok": True})


app = web.Application()
app.router.add_get("/v1/health", health)
app.router.add_post("/v1/sessions", create)
app.router.add_delete("/v1/sessions/{sid}", delete)
app.router.add_get("/v1/sessions/{sid}/ws", conversation)
app.router.add_get("/v1/transcribe/ws", transcribe)
app.router.add_post("/test/capacity", set_capacity)
app.router.add_get("/test/texts", last_text)
app.router.add_post("/test/drop", drop)
app.router.add_post("/test/pause", pause)
web.run_app(app, host="127.0.0.1", port=PORT, print=None)
