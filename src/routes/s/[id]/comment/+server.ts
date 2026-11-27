import { error, json } from '@sveltejs/kit';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import {
	normalizeComment,
	takeCommentSlot,
	type CommentMessage
} from '#lib/server/spaces/comments.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import { REACTION_TOPIC } from '#lib/server/spaces/reactions.ts';
import { visibleTo } from '../access.ts';
import type { RequestHandler } from './$types';

/**
 * コメント（COMM-01〜04）。入室の確認・文面の確認・連投の制限をサーバーで行い、通ったものだけを
 * リアクションと同じ経路で入室者全員に配る（design.md D1）。保存せず、文面はログにも出さない。
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const did = requireNagiUser(locals);
	const { lifecycle, presence, rooms, store } = await getRuntime();
	const space = visibleTo(
		isSpaceId(params.id) ? await lifecycle.getLive(params.id) : undefined,
		did
	);
	if (!space) error(404, 'Space not found');
	// botたんSpace には読む相手がいないので受け付けない
	if (space.kind === 'bot') error(403, 'Comments are not available in this Space');
	if (space.hostDid !== did && !(await presence.roleOf(space.id, did)))
		error(403, 'Not in this Space');

	const body = (await request.json().catch(() => ({}))) as { text?: unknown };
	const text = normalizeComment(body.text);
	if (!text) error(400, 'Invalid comment');
	if (!(await takeCommentSlot(store, space.id, did))) {
		return json({ error: 'rateLimited' }, { status: 429 });
	}
	const message: CommentMessage = {
		type: 'comment',
		from: {
			did,
			name: locals.profile?.displayName || locals.profile?.handle || did,
			...(locals.profile?.avatar ? { avatar: locals.profile.avatar } : {})
		},
		text
	};
	await rooms.broadcast(space.id, REACTION_TOPIC, message);
	return new Response(null, { status: 204 });
};
