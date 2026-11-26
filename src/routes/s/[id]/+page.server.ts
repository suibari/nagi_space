import { getRuntime } from '#lib/server/runtime.ts';
import { endedByTimeLimit } from '#lib/server/spaces/limits.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import { initialRole, visibleTo } from './access.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { spaces, lifecycle } = await getRuntime();
	const found = visibleTo(
		isSpaceId(params.id) ? await spaces.get(params.id) : undefined,
		locals.did
	);
	if (!found) return { state: 'notFound' as const };
	const space = await lifecycle.enforce(found);
	if (!space) {
		const ended = (await spaces.get(found.id)) ?? found;
		return {
			state: 'ended' as const,
			title: ended.title,
			timeLimit:
				!!ended.endedAt && endedByTimeLimit(ended.startedAt, ended.endedAt, lifecycle.limits)
		};
	}

	const summary = {
		id: space.id,
		kind: space.kind,
		title: space.title,
		startedAt: space.startedAt,
		host: {
			did: space.hostDid,
			displayName: space.host.displayName,
			handle: space.host.handle,
			avatar: space.host.avatar
		}
	};
	// 未ログイン・未登録の閲覧者にはタイトルとホストだけを見せる（ACC-03）
	if (!locals.did) return { state: 'anonymous' as const, space: summary };
	if (locals.nagiUser !== 'registered') return { state: 'unregistered' as const, space: summary };
	return {
		state: 'live' as const,
		space: summary,
		role: initialRole(space, locals.did),
		maxDurationSeconds: lifecycle.limits.maxDurationSeconds
	};
};
