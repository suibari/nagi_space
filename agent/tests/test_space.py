"""botたんSpace では botたんの接続で字幕も受け持つ（simplify-bot-space D2）。"""
import space_agent.space as space_module
from space_agent.space import SpaceWorker


class FakeBot:
    def __init__(self, space_id, kind, url, token, convo, log, context=None):
        self.room = object()
        self.closed = False
        self.failed = False
        self.stopped = False

    async def start(self):
        pass

    async def stop(self):
        self.stopped = True
        self.closed = True

    async def hear(self, name, text):
        pass

    async def interrupt(self):
        pass


class FakeCaptions:
    made = []

    def __init__(self, space_id, url, token, convo, log, room=None):
        self.token, self.room = token, room
        self.started = self.stopped = self.closed = False
        self.on_transcript = self.on_speech_start = None
        FakeCaptions.made.append(self)

    async def start(self):
        self.started = True

    async def stop(self):
        self.stopped = self.closed = True


def patch(monkeypatch):
    FakeCaptions.made = []
    monkeypatch.setattr(space_module, "BotWorker", FakeBot)
    monkeypatch.setattr(space_module, "CaptionsWorker", FakeCaptions)


async def test_bot_space_shares_the_bot_connection_for_captions(monkeypatch):
    patch(monkeypatch)
    worker = SpaceWorker({"spaceId": "s", "kind": "bot", "startedAt": "t"}, "ws://lk", None, lambda m: None)
    # 字幕用の参加者は入らない
    assert worker.captions is None and FakeCaptions.made == []
    await worker.want_bot("bot-token")
    captions = worker.captions
    assert captions is not None and captions.room is worker.bot.room and captions.token is None
    assert captions.started and captions.on_transcript == worker.bot.hear

    # botたんが落ちると字幕も止まる（BOT-06）
    worker.bot.closed = worker.bot.failed = True
    await worker.want_bot(None)
    assert worker.bot is None and worker.captions is None and captions.stopped
    assert worker.alive


async def test_public_space_keeps_its_own_captions(monkeypatch):
    patch(monkeypatch)
    worker = SpaceWorker({"spaceId": "p", "kind": "public", "startedAt": "t", "captionsToken": "c"},
                         "ws://lk", None, lambda m: None)
    captions = worker.captions
    assert captions.token == "c" and captions.room is None
    await worker.want_bot("bot-token")
    assert worker.captions is captions and captions.on_transcript == worker.bot.hear
    await worker.want_bot(None)
    # パブリックSpace は botたんが抜けても字幕は続く
    assert worker.captions is captions and not captions.stopped and captions.on_transcript is None
