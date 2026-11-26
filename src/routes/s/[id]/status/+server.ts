import { json } from '@sveltejs/kit';
import { getRuntime } from '#lib/server/runtime.ts';
import { endedByTimeLimit } from '#lib/server/spaces/limits.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import { visibleTo } from '../access.ts';
import type { RequestHandler } from './$types';

/**
 * Space の状態。入室中の画面が、ホストの不在中や時間の上限が近いときに呼ぶ。
 * 呼ばれたときに期限を確かめ、過ぎていれば終える（LIFE-06・LIFE-09）。
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { spaces, lifecycle } = await getRuntime();
	const found = visibleTo(
		isSpaceId(params.id) ? await spaces.get(params.id) : undefined,
		locals.did
	);
	if (!found) return json({ state: 'notFound' }, { status: 404 });
	const live = await lifecycle.enforce(found);
	if (live) {
		return json(
			{ state: 'live', hostAway: await lifecycle.isHostAway(live.id) },
			{ headers: { 'cache-control': 'no-store' } }
		);
	}
	const ended = (await spaces.get(found.id)) ?? found;
	return json(
		{
			state: 'ended',
			timeLimit:
				!!ended.endedAt && endedByTimeLimit(ended.startedAt, ended.endedAt, lifecycle.limits)
		},
		{ headers: { 'cache-control': 'no-store' } }
	);
};
