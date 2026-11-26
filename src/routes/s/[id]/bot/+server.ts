import { error, json } from '@sveltejs/kit';
import { isBotAvailable } from '#lib/server/bot/capacity.ts';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId, type Space } from '#lib/server/spaces/model.ts';
import { BOT_IDENTITY } from '#lib/server/spaces/presence.ts';
import { visibleTo } from '../access.ts';
import type { RequestHandler } from './$types';

async function hostSpace(id: string, did: string): Promise<Space> {
	const { lifecycle } = await getRuntime();
	const space = visibleTo(isSpaceId(id) ? await lifecycle.getLive(id) : undefined, did);
	if (!space) error(404, 'Space not found');
	// botたんの招待と除外はホストだけ（BOT-01）
	if (space.hostDid !== did) error(403, 'Only the host can invite or remove bot-tan');
	return space;
}

/** botたんの状態（招待中か・参加しているか・いま招待できるか。BOT-02）。 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const did = requireNagiUser(locals);
	const space = await hostSpace(params.id, did);
	const { botRequests, presence, store } = await getRuntime();
	return json(
		{
			requested: await botRequests.requested(space.id),
			present: (await presence.counts(space.id)).botPresent,
			available: await isBotAvailable(store)
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};

/** botたんを招待・除外する（BOT-01）。空きが無ければ招待できない（BOT-02）。 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const did = requireNagiUser(locals);
	const space = await hostSpace(params.id, did);
	const { botRequests, rooms, store } = await getRuntime();
	const body = (await request.json().catch(() => ({}))) as { action?: unknown };
	if (body.action === 'invite') {
		if (await botRequests.requested(space.id)) return new Response(null, { status: 204 });
		if (!(await isBotAvailable(store))) return json({ error: 'botBusy' }, { status: 409 });
		await botRequests.request(space.id);
		return new Response(null, { status: 204 });
	}
	if (body.action === 'remove') {
		await botRequests.cancel(space.id);
		// space-agent の次の同期を待たずに退出させる。会話のセッションは space-agent が閉じる
		await rooms.removeParticipant(space.id, BOT_IDENTITY);
		return new Response(null, { status: 204 });
	}
	error(400, 'Unknown action');
};
