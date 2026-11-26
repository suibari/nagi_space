import asyncio

from space_agent.__main__ import Agent
from space_agent.config import Config


class FakeWorker:
    started: list[str] = []
    stopped: list[str] = []

    def __init__(self, job, url, convo, log):
        self.id = job["spaceId"]
        self.alive = True
        self.bot_token = None

    def launch(self):
        FakeWorker.started.append(self.id)

    def desire(self, token):
        self.bot_token = token

    async def stop(self):
        FakeWorker.stopped.append(self.id)


def job(sid, started, bot=False):
    return {"spaceId": sid, "kind": "public", "startedAt": started, "bot": bot,
            "captionsToken": "c", **({"botToken": "b"} if bot else {})}


async def test_reconcile_starts_oldest_within_limit_and_stops_ended():
    FakeWorker.started, FakeWorker.stopped = [], []
    cfg = Config("http://space", "s", "http://convo", "login")
    agent = Agent(cfg, http=None, convo=None, worker_factory=FakeWorker)
    body = {"livekitUrl": "ws://lk", "jobs": [job("new", "2026-01-02"), job("old", "2026-01-01", bot=True),
                                              job("newest", "2026-01-03")]}
    await agent.reconcile(body, captions_max=2)
    # 字幕のつなぎの上限までは古い Space から受け持つ
    assert FakeWorker.started == ["old", "new"]
    assert agent.workers["old"].bot_token == "b" and agent.workers["new"].bot_token is None

    await agent.reconcile({"livekitUrl": "ws://lk", "jobs": [job("new", "2026-01-02")]}, captions_max=2)
    await asyncio.gather(*agent.stopping)
    assert FakeWorker.stopped == ["old"]
    assert set(agent.workers) == {"new"}
