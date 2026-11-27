import { error, json } from '@sveltejs/kit';
import {
	agentToken,
	isAgentRequest,
	parseAgentReport,
	recordAgentReport,
	type AgentJob
} from '#lib/server/bot/agent.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import type { RequestHandler } from './$types';

/**
 * 自宅の space-agent との同期（design.md D5）。space-agent は数秒ごとに botたんと字幕の空きを
 * 知らせ、開催中の Space の一覧（字幕と botたんの参加者のトークン付き）を受け取る。
 * 自宅から外へ向かう通信だけで済むよう、space-agent の側から呼ぶ。
 */
export const POST: RequestHandler = async ({ request }) => {
	const { agentSecret, store, spaces, botRequests, livekit, lifecycle } = await getRuntime();
	if (!isAgentRequest(request.headers.get('authorization'), agentSecret))
		error(401, 'Unauthorized');
	const report = parseAgentReport(await request.json().catch(() => undefined));
	if (!report) error(400, 'Invalid report');
	await recordAgentReport(store, report);

	const live = (
		await Promise.all((await spaces.listLive()).map((s) => lifecycle.enforce(s)))
	).filter((s) => s !== undefined);
	const wantBot = await botRequests.requestedMany(live.map((s) => s.id));
	const jobs: AgentJob[] = await Promise.all(
		live.map(async (space) => ({
			spaceId: space.id,
			kind: space.kind,
			startedAt: space.startedAt,
			bot: wantBot.has(space.id),
			// botたんSpace は botたん1人で字幕も受け持ち、字幕用の参加者を入れない（TRANS-01・BOT-06）
			...(space.kind === 'public'
				? { captionsToken: await agentToken(livekit, space.id, 'captions') }
				: {}),
			...(wantBot.has(space.id)
				? {
						botToken: await agentToken(livekit, space.id, 'bot', {
							listen: space.kind === 'bot'
						})
					}
				: {})
		}))
	);
	return json({ livekitUrl: livekit.url, jobs }, { headers: { 'cache-control': 'no-store' } });
};
