import { error, json } from '@sveltejs/kit';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import { initialRole, visibleTo } from '../access.ts';
import type { RequestHandler } from './$types';

/** 入室用の LiveKit トークン。ロールの権限はトークンに入れてサーバーが決める（design.md D3）。 */
export const POST: RequestHandler = async ({ params, locals }) => {
	const did = requireNagiUser(locals);
	const { spaces, rooms } = await getRuntime();
	const found = isSpaceId(params.id) ? await spaces.getLive(params.id) : undefined;
	const space = visibleTo(found, did);
	if (!space) error(404, 'Space not found');
	const role = initialRole(space, did);
	const name = locals.profile?.displayName || locals.profile?.handle || did;
	const token = await rooms.issueToken({ space, did, name, role });
	return json({ url: rooms.url, token, role }, { headers: { 'cache-control': 'no-store' } });
};
