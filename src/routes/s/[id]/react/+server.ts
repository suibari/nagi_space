import { error, json } from '@sveltejs/kit';
import { getCustomEmoji } from '#lib/server/emoji.ts';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import {
	REACTION_TOPIC,
	cachedEmojiLookup,
	takeReactionSlot,
	validateChoice,
	type ReactionMessage
} from '#lib/server/spaces/reactions.ts';
import { visibleTo } from '../access.ts';
import type { RequestHandler } from './$types';

/**
 * 絵文字のリアクション（REACT-01〜04）。連投制限と絵文字の確認をサーバーで行い、
 * 通ったものだけを入室者全員に配る。保存はしない。
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const did = requireNagiUser(locals);
	const { lifecycle, presence, rooms, store, appviewUrl } = await getRuntime();
	const space = visibleTo(
		isSpaceId(params.id) ? await lifecycle.getLive(params.id) : undefined,
		did
	);
	if (!space) error(404, 'Space not found');
	// 入室している人だけが送れる
	if (space.hostDid !== did && !(await presence.roleOf(space.id, did)))
		error(403, 'Not in this Space');

	const body = (await request.json().catch(() => ({}))) as { choice?: unknown };
	const lookup = cachedEmojiLookup(store, (uri) => getCustomEmoji(uri, appviewUrl));
	const choice = await validateChoice(body.choice, lookup).catch(() => undefined);
	if (!choice) error(400, 'Invalid emoji');
	if (!(await takeReactionSlot(store, space.id, did))) {
		return json({ error: 'rateLimited' }, { status: 429 });
	}
	const message: ReactionMessage = {
		type: 'reaction',
		from: {
			did,
			name: locals.profile?.displayName || locals.profile?.handle || did,
			...(locals.profile?.avatar ? { avatar: locals.profile.avatar } : {})
		},
		choice
	};
	await rooms.broadcast(space.id, REACTION_TOPIC, message);
	return new Response(null, { status: 204 });
};
