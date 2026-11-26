import { error } from '@sveltejs/kit';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import type { RequestHandler } from './$types';

/** ホストによる終了（LIFE-05）。room を消して全員の接続を切り、開催情報だけを残す（LIFE-07）。 */
export const POST: RequestHandler = async ({ params, locals }) => {
	const did = requireNagiUser(locals);
	const { spaces, rooms, presence } = await getRuntime();
	const space = isSpaceId(params.id) ? await spaces.getLive(params.id) : undefined;
	if (!space || (space.kind === 'bot' && space.hostDid !== did)) error(404, 'Space not found');
	if (space.hostDid !== did) error(403, 'Only the host can end the Space');
	await spaces.end(space.id);
	await presence.clear(space.id);
	await rooms.deleteRoom(space.id);
	return new Response(null, { status: 204 });
};
