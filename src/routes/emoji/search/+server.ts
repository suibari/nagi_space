import { json } from '@sveltejs/kit';
import { searchCustomEmojis } from '#lib/server/emoji.ts';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import type { RequestHandler } from './$types';

/** カスタム絵文字の検索（REACT-02）。AppView に届かなければ空にする（Unicode 絵文字は画面で検索できる）。 */
export const GET: RequestHandler = async ({ url, locals }) => {
	requireNagiUser(locals);
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 64);
	if (!q) return json({ custom: [] });
	const { appviewUrl } = await getRuntime();
	const custom = await searchCustomEmojis(q, appviewUrl).catch((cause) => {
		console.warn('[emoji] search failed', cause instanceof Error ? cause.message : cause);
		return [];
	});
	return json({ custom }, { headers: { 'cache-control': 'private, max-age=30' } });
};
