import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import { initialRole, visibleTo } from './access.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { spaces } = await getRuntime();
	const space = visibleTo(
		isSpaceId(params.id) ? await spaces.get(params.id) : undefined,
		locals.did
	);
	if (!space) return { state: 'notFound' as const };
	if (space.endedAt) return { state: 'ended' as const, title: space.title };

	const summary = {
		id: space.id,
		kind: space.kind,
		title: space.title,
		host: {
			displayName: space.host.displayName,
			handle: space.host.handle,
			avatar: space.host.avatar
		}
	};
	// 未ログイン・未登録の閲覧者にはタイトルとホストだけを見せる（ACC-03）
	if (!locals.did) return { state: 'anonymous' as const, space: summary };
	if (locals.nagiUser !== 'registered') return { state: 'unregistered' as const, space: summary };
	return { state: 'live' as const, space: summary, role: initialRole(space, locals.did) };
};
