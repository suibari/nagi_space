import { error } from '@sveltejs/kit';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import type { RequestHandler } from './$types';

/** ホストによる終了・退室（LIFE-05・LIFE-06）。 */
export const POST: RequestHandler = async ({ params, locals }) => {
	const did = requireNagiUser(locals);
	const { lifecycle } = await getRuntime();
	const space = isSpaceId(params.id) ? await lifecycle.getLive(params.id) : undefined;
	if (!space || (space.kind === 'bot' && space.hostDid !== did)) error(404, 'Space not found');
	if (space.hostDid !== did) error(403, 'Only the host can end the Space');
	await lifecycle.end(space.id);
	return new Response(null, { status: 204 });
};
