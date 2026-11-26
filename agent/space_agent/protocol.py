"""Nagi Space の画面と取り決めたデータの形（LiveKit のデータメッセージ）。画面の側は src/lib/space/。"""
from __future__ import annotations

import json

CAPTION_TOPIC = "nagi-space.caption"
BOT_TOPIC = "nagi-space.bot"
BOT_IDENTITY = "bot:bot-tan"
CAPTIONS_IDENTITY = "agent:captions"
SPEAKER_AUDIO_IN = 0x03
AUDIO_OUT = 0x11


def caption(speaker: str, name: str, text: str) -> bytes:
    """確定した字幕の1行（TRANS-01）。"""
    return json.dumps({"type": "caption", "speaker": speaker, "name": name, "text": text},
                      ensure_ascii=False).encode()


def captions_state(paused: bool) -> bytes:
    """混雑による字幕の一時停止・再開（TRANS-03）。"""
    return json.dumps({"type": "captions.paused" if paused else "captions.resumed"}).encode()


def bot_event(kind: str, **fields) -> bytes:
    """botたんの動きと状態（BOT-05）。kind は motion / state / flush。"""
    return json.dumps({"type": f"bot.{kind}", **fields}, ensure_ascii=False).encode()


def speaker_frame(speaker: str, pcm: bytes) -> bytes:
    """convo の字幕だけのつなぎへ送る、話者付きの声。"""
    sid = speaker.encode()[:255]
    return bytes([SPEAKER_AUDIO_IN, len(sid)]) + sid + pcm


def parse_audio_out(data: bytes) -> tuple[str, bytes] | None:
    """convo の返事の声（0x11 ＋ 発話IDの長さ ＋ 発話ID ＋ 24kHz の PCM16）。"""
    if len(data) < 2 or data[0] != AUDIO_OUT:
        return None
    n = data[1]
    return data[2:2 + n].decode("utf-8", "replace"), data[2 + n:]


def role_of(metadata: str | None) -> str:
    try:
        role = json.loads(metadata or "{}").get("role")
    except (ValueError, AttributeError):
        return "listener"
    return role if role in ("host", "speaker", "bot", "agent") else "listener"
