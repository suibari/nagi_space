"""space-agent の本体。Nagi Space と数秒ごとに同期し、開催中の Space の字幕と botたんを受け持つ。

  SPACE_API_URL=… AGENT_SECRET=… CONVO_URL=http://127.0.0.1:8771 CONVO_LOGIN=… python -m space_agent
"""
from __future__ import annotations

import asyncio
import contextlib
import time

import aiohttp
from aiohttp import web

from .config import Config
from .convo import Capacity, ConvoClient
from .space import SpaceWorker


def log(msg: str) -> None:
    print(f"{time.strftime('%H:%M:%S')} {msg}", flush=True)


class Agent:
    def __init__(self, cfg: Config, http: aiohttp.ClientSession, convo: ConvoClient,
                 worker_factory=SpaceWorker) -> None:
        self.cfg, self.http, self.convo, self.worker_factory = cfg, http, convo, worker_factory
        self.workers: dict[str, SpaceWorker] = {}
        self.stopping: set[asyncio.Task] = set()
        self.last_sync_ok = 0.0

    async def capacity(self) -> Capacity:
        try:
            return await self.convo.capacity()
        except Exception as e:  # convo が止まっていれば、botたんも字幕も受けられないと知らせる（BOT-06）
            log(f"⚠ convo に届かない: {type(e).__name__}")
            return Capacity(0, 0, 0, 0)

    async def sync(self) -> dict:
        cap = await self.capacity()
        report = {"bot": {"free": cap.bot_free, "max": cap.bot_max},
                  "captions": {"free": cap.captions_free, "max": cap.captions_max}}
        async with self.http.post(f"{self.cfg.space_api_url}/agent/sync", json=report,
                                  headers={"Authorization": f"Bearer {self.cfg.agent_secret}"},
                                  timeout=aiohttp.ClientTimeout(total=10)) as r:
            r.raise_for_status()
            body = await r.json()
        self.last_sync_ok = time.monotonic()
        return body

    async def reconcile(self, body: dict, captions_max: int) -> None:
        """望む状態を Space ごとのタスクに渡すだけで、接続を待たない（同期と空きの知らせを止めない）。"""
        jobs = {job["spaceId"]: job for job in body.get("jobs", [])}
        for sid in [s for s, w in self.workers.items() if s not in jobs or not w.alive]:
            worker = self.workers.pop(sid)
            task = asyncio.create_task(worker.stop())
            self.stopping.add(task)
            task.add_done_callback(self.stopping.discard)
        # 字幕のつなぎの上限までは、古い Space から受け持つ（TRANS-03）
        for job in sorted(jobs.values(), key=lambda j: j["startedAt"]):
            worker = self.workers.get(job["spaceId"])
            if worker is None:
                if len(self.workers) >= captions_max:
                    continue
                worker = self.worker_factory(job, body["livekitUrl"], self.convo, log)
                self.workers[job["spaceId"]] = worker
                worker.launch()
            worker.desire(job.get("botToken") if job.get("bot") else None)

    async def run(self) -> None:
        while True:
            try:
                body = await self.sync()
                cap = await self.capacity()
                await self.reconcile(body, max(cap.captions_max, len(self.workers)))
            except Exception as e:
                log(f"⚠ 同期に失敗: {type(e).__name__}: {e}")
            await asyncio.sleep(self.cfg.sync_interval_s)

    async def close(self) -> None:
        for worker in list(self.workers.values()):
            with contextlib.suppress(Exception):
                await worker.stop()
        self.workers.clear()


async def serve_health(agent: Agent, port: int) -> web.AppRunner:
    """死活確認（systemd や E2E から）。"""
    async def health(_request: web.Request) -> web.Response:
        return web.json_response({"ok": True, "spaces": len(agent.workers),
                                  "synced_s_ago": round(time.monotonic() - agent.last_sync_ok, 1)})
    app = web.Application()
    app.router.add_get("/health", health)
    runner = web.AppRunner(app)
    await runner.setup()
    await web.TCPSite(runner, "127.0.0.1", port).start()
    return runner


async def main() -> None:
    cfg = Config.from_env()
    async with aiohttp.ClientSession() as http:
        agent = Agent(cfg, http, ConvoClient(http, cfg.convo_url, cfg.convo_login))
        runner = await serve_health(agent, cfg.health_port) if cfg.health_port else None
        log(f"space-agent を始めた（{cfg.space_api_url}）")
        try:
            await agent.run()
        finally:
            await agent.close()
            if runner:
                await runner.cleanup()


if __name__ == "__main__":
    with contextlib.suppress(KeyboardInterrupt):
        asyncio.run(main())
