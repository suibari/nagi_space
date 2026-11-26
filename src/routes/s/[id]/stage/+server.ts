import { error, json } from '@sveltejs/kit';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId, type Space } from '#lib/server/spaces/model.ts';
import type { StageResult } from '#lib/server/spaces/stage.ts';
import { visibleTo } from '../access.ts';
import type { RequestHandler } from './$types';

async function liveSpaceFor(id: string, did: string): Promise<Space> {
	const { lifecycle } = await getRuntime();
	const space = visibleTo(isSpaceId(id) ? await lifecycle.getLive(id) : undefined, did);
	if (!space) error(404, 'Space not found');
	return space;
}

/** 発話に関わる自分の状態。ホストにはリクエストの一覧も返す。 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const did = requireNagiUser(locals);
	const space = await liveSpaceFor(params.id, did);
	const { stage } = await getRuntime();
	const role = await stage.roleOf(space, did);
	return json(
		{
			role,
			requested: await stage.hasRequest(space, did),
			offer: (await stage.offerOf(space, did)) ?? null,
			requests: role === 'host' ? await stage.listRequests(space) : []
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};

type Action =
	| 'request'
	| 'cancel'
	| 'accept'
	| 'decline'
	| 'leave'
	| 'approve'
	| 'invite'
	| 'revoke'
	| 'mute'
	| 'kick';
const HOST_ACTIONS: Action[] = ['approve', 'invite', 'revoke', 'mute', 'kick'];

/** 発話のリクエスト・承認・招待・受け入れ・聴衆へ戻る・ホストのモデレーション（PART-03・04・06）。 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const did = requireNagiUser(locals);
	const space = await liveSpaceFor(params.id, did);
	const { stage } = await getRuntime();
	const body = (await request.json().catch(() => ({}))) as { action?: Action; target?: string };
	const action = body.action;
	if (!action) error(400, 'action is required');
	const isHost = space.hostDid === did;
	if (HOST_ACTIONS.includes(action) && !isHost) error(403, 'Only the host can do this');
	const target = typeof body.target === 'string' ? body.target : '';
	if (HOST_ACTIONS.includes(action) && (!target || target === space.hostDid)) {
		error(400, 'target is required');
	}
	const name = locals.profile?.displayName || locals.profile?.handle || did;

	const run: Record<Action, () => Promise<StageResult>> = {
		request: () => stage.request(space, did, name),
		cancel: () => stage.cancel(space, did),
		accept: () => stage.accept(space, did),
		decline: () => stage.decline(space, did),
		leave: () => stage.demote(space, did),
		approve: () => stage.approve(space, target),
		invite: () => stage.invite(space, target),
		revoke: () => stage.demote(space, target),
		mute: () => stage.mute(space, target),
		kick: () => stage.kick(space, target)
	};
	if (!run[action]) error(400, 'Unknown action');
	const result = await run[action]();
	if (!result.ok) return json({ error: result.error }, { status: 409 });
	return new Response(null, { status: 204 });
};
