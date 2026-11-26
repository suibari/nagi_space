import { error } from '@sveltejs/kit';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import { BOT_IDENTITY, parseRole } from '#lib/server/spaces/presence.ts';
import type { RequestHandler } from './$types';

/** LiveKit の Webhook。署名を確かめてから、入退室と room の終了を反映する（design.md D3）。 */
export const POST: RequestHandler = async ({ request }) => {
	const { webhooks, presence, lifecycle, botRequests, rooms } = await getRuntime();
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

	if (event.event === 'room_finished') {
		// 誰もいなくなって LiveKit が room を片付けたら、Space も終える
		await lifecycle.end(spaceId);
		return new Response(null, { status: 204 });
	}
	// 終了後に遅れて届いた通知では何も作り直さない（LIFE-07）。期限もここで確かめる
	const space = await lifecycle.getLive(spaceId);
	const participant = event.participant;
	if (!space || !participant) return new Response(null, { status: 204 });

	const isHost = participant.identity === space.hostDid;
	if (event.event === 'participant_joined') {
		await presence.joined(spaceId, participant.identity, parseRole(participant.metadata));
		if (isHost) await lifecycle.hostReturned(spaceId);
	} else if (event.event === 'participant_left') {
		await presence.left(spaceId, participant.identity);
		// ホストの切断は3分待つ（LIFE-06）。自分で退室したときは終了の操作で先に終わっている
		if (isHost) await lifecycle.hostLeft(spaceId);
		// ホストが除外していないのに botたんが抜けた（space-agent や convo の障害）。退出扱いにして
		// ホストに知らせ、再招待できるようにする（BOT-06）
		if (participant.identity === BOT_IDENTITY && (await botRequests.cancel(spaceId))) {
			await rooms.notify(spaceId, [space.hostDid], { type: 'bot.left' }).catch(() => undefined);
		}
	}
	return new Response(null, { status: 204 });
};
