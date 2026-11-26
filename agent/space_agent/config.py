"""space-agent の設定。すべて環境変数で渡す（README の「space-agent」）。"""
from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Config:
    space_api_url: str        # Nagi Space（例 https://nagi-space.suibari.com）
    agent_secret: str         # Nagi Space の AGENT_SECRET と同じ値
    convo_url: str            # bot-tan-convo（例 http://127.0.0.1:8771）
    convo_login: str          # convo の allowed_logins にある名前（Tailscale-User-Login として送る）
    sync_interval_s: float = 3.0
    health_port: int = 0      # 0 なら死活確認の口を開かない

    @staticmethod
    def from_env() -> "Config":
        def need(name: str) -> str:
            value = os.environ.get(name, "").strip()
            if not value:
                raise SystemExit(f"環境変数 {name} を設定してください")
            return value

        return Config(
            space_api_url=need("SPACE_API_URL").rstrip("/"),
            agent_secret=need("AGENT_SECRET"),
            convo_url=need("CONVO_URL").rstrip("/"),
            convo_login=need("CONVO_LOGIN"),
            sync_interval_s=float(os.environ.get("SYNC_INTERVAL_S", "3")),
            health_port=int(os.environ.get("AGENT_HEALTH_PORT", "0")),
        )
