"""botたんの会話を作るときに Nagi Space から受け取る文脈（BOT-08）。

botたんSpace ではホストの最近の Nagi の投稿が入り、パブリックSpace では空。受け取ったものは convo に
渡すだけで、ここでは持たない。本文はログに出さない。
"""
from __future__ import annotations

from typing import Callable

import aiohttp

TIMEOUT_S = 6.0  # Nagi Space はホストの PDS を最大3秒待つ


class ContextClient:
    def __init__(self, http: aiohttp.ClientSession, space_api_url: str, agent_secret: str,
                 log: Callable[[str], None]) -> None:
        self.http, self.url, self.secret, self.log = http, space_api_url.rstrip("/"), agent_secret, log

    async def for_space(self, space_id: str) -> str:
        """読めなければ空にする（botたんの参加は止めない）。"""
        try:
            async with self.http.get(f"{self.url}/agent/context/{space_id}",
                                     headers={"Authorization": f"Bearer {self.secret}"},
                                     timeout=aiohttp.ClientTimeout(total=TIMEOUT_S)) as r:
                r.raise_for_status()
                context = (await r.json()).get("context")
        except Exception as e:
            self.log(f"⚠ 文脈を受け取れない（なしで始める）: {type(e).__name__}")
            return ""
        return context if isinstance(context, str) else ""
