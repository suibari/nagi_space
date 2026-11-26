import { json } from '@sveltejs/kit';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import type { RequestHandler } from './$types';

/** Nagi と同期しているお気に入り絵文字（REACT-02）。本人にだけ返す。 */
export const GET: RequestHandler = async ({ locals }) => {
	const did = requireNagiUser(locals);
	const { emojiFavorites } = await getRuntime();
	return json(
		{ favorites: await emojiFavorites(did) },
		{ headers: { 'cache-control': 'no-store' } }
	);
};
