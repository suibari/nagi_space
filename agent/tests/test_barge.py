"""割り込みの二段構え（BOT-04）。"""
from space_agent.barge import BargeGate


def gate():
    calls = []

    def act(name):
        async def run():
            calls.append(name)
        return run
    return BargeGate(act("pause"), act("interrupt"), act("resume")), calls


async def test_backchannel_resumes():
    g, calls = gate()
    await g.start("alice")
    await g.end("alice")  # 1秒続かなかった（相づち）
    assert calls == ["pause", "resume"]


async def test_confirmed_speech_interrupts():
    g, calls = gate()
    await g.start("alice")
    await g.confirmed("alice")
    await g.end("alice")  # 止めたあとの区切りでは続けない
    assert calls == ["pause", "interrupt"]


async def test_two_speakers_resume_after_both_end():
    g, calls = gate()
    await g.start("alice")
    await g.start("bob")
    await g.end("alice")
    assert calls == ["pause"]
    await g.end("bob")
    assert calls == ["pause", "resume"]


async def test_events_without_start_are_ignored():
    g, calls = gate()
    await g.confirmed("alice")
    await g.end("alice")
    assert calls == []
