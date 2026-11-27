"""botたんの会話を作るときの文脈（BOT-08）。"""
import asyncio

import aiohttp
from aiohttp import web

from space_agent.bot import BotWorker
from space_agent.context import ContextClient
from space_agent.convo import ConvoClient


async def serve(routes):
    app = web.Application()
    app.add_routes(routes)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]
    return runner, f"http://127.0.0.1:{port}"


async def test_context_client_reads_and_falls_back():
    seen = {}

    async def ok(request):
        seen["auth"] = request.headers.get("Authorization")
        return web.json_response({"context": "（最近書いたこと）\n- 昨日: カフェ"})

    async def broken(_request):
        return web.Response(status=500)

    runner, url = await serve([web.get("/agent/context/ok", ok), web.get("/agent/context/ng", broken)])
    logs = []
    try:
        async with aiohttp.ClientSession() as http:
            client = ContextClient(http, url, "secret", logs.append)
            assert "カフェ" in await client.for_space("ok")
            assert seen["auth"] == "Bearer secret"
            assert await client.for_space("ng") == ""
    finally:
        await runner.cleanup()
    # 文脈の本文はログに出さない
    assert not any("カフェ" in line for line in logs)


async def test_bot_session_gets_context_only_in_bot_space():
    bodies = []

    async def create(request):
        bodies.append(await request.json())
        return web.json_response({"session_id": "s1"}, status=201)

    runner, url = await serve([web.post("/v1/sessions", create)])
    try:
        async with aiohttp.ClientSession() as http:
            convo = ConvoClient(http, url, "login")

            async def context(space_id):
                return f"（{space_id} のホストが最近書いたこと）"

            for kind in ("bot", "public"):
                worker = BotWorker("space1", kind, "ws://lk", "token", convo, lambda m: None, context)
                # LiveKit への接続の前で止める（会話の作成までを確かめる）
                worker.convo.conversation = None  # type: ignore[assignment]
                try:
                    await worker.start()
                except TypeError:
                    pass
            # 文脈が読めなくても会話は作る
            async def empty(_space_id):
                return ""
            worker = BotWorker("space2", "bot", "ws://lk", "token", convo, lambda m: None, empty)
            worker.convo.conversation = None  # type: ignore[assignment]
            try:
                await worker.start()
            except TypeError:
                pass
    finally:
        await runner.cleanup()
    assert bodies[0] == {"profile": "space_bot", "key": "space1", "context": "（space1 のホストが最近書いたこと）"}
    assert bodies[1] == {"profile": "space", "key": "space1"}
    assert bodies[2] == {"profile": "space_bot", "key": "space2"}
