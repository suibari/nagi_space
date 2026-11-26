import { error } from '@sveltejs/kit';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import {
	buildSharePost,
	shareDraftKey,
	shareToNagi,
	validateShareText
} from '#lib/server/share.ts';
import type { RequestHandler } from './$types';

/** 開始時のシェアに失敗したときの再試行（LIFE-04）。ホストだけが使える。 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const did = requireNagiUser(locals);
	const { lifecycle, oauth, store, auth } = await getRuntime();
	const space = isSpaceId(params.id) ? await lifecycle.getLive(params.id) : undefined;
	if (!space || space.hostDid !== did) error(404, 'Space not found');
	if (space.kind !== 'public') error(400, 'Only public Spaces can be shared');

	const body = (await request.json().catch(() => ({}))) as { text?: unknown };
	const text = validateShareText(body.text);
	if (!text.ok) error(400, text.reason);
	const record = buildSharePost({
		text: text.text,
		spaceUrl: new URL(`/s/${space.id}`, auth.origin).href,
		title: space.title,
		hostName: space.host.displayName ?? space.host.handle,
		locale: locals.locale
	});
	try {
		await shareToNagi(await oauth.restore(did), record);
	} catch (cause) {
		console.warn('[share] retry failed', cause instanceof Error ? cause.message : cause);
		error(502, 'Share failed');
	}
	await store.del(shareDraftKey(space.id));
	return new Response(null, { status: 204 });
};
