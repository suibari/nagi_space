import { error } from '@sveltejs/kit';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import { parseRole } from '#lib/server/spaces/presence.ts';
import type { RequestHandler } from './$types';

/** LiveKit の Webhook。署名を確かめてから、入退室と room の終了を反映する（design.md D3）。 */
export const POST: RequestHandler = async ({ request }) => {
	const { webhooks, presence, spaces } = await getRuntime();
	let event;
	try {
		event = await webhooks.receive(
			await request.text(),
			request.headers.get('authorization') ?? ''
		);
	} catch {
		error(401, 'Invalid webhook signature');
	}
	const spaceId = event.room?.name;
	if (!spaceId || !isSpaceId(spaceId)) return new Response(null, { status: 204 });

	const participant = event.participant;
	switch (event.event) {
		case 'participant_joined':
			if (participant)
				await presence.joined(spaceId, participant.identity, parseRole(participant.metadata));
			break;
		case 'participant_left':
			if (participant) await presence.left(spaceId, participant.identity);
			break;
		case 'room_finished':
			// 誰もいなくなって LiveKit が room を片付けたら、Space も終える
			await spaces.end(spaceId);
			await presence.clear(spaceId);
			break;
	}
	return new Response(null, { status: 204 });
};
