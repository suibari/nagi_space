import { fail, redirect } from '@sveltejs/kit';
import { isBotAvailable } from '#lib/server/bot/capacity.ts';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceKind, newSpaceId, validateTitle, type Space } from '#lib/server/spaces/model.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.did) redirect(303, '/login?returnTo=%2Fspaces%2Fnew');
	if (locals.nagiUser !== 'registered') redirect(303, '/');
	const { spaces } = await getRuntime();
	const active = await spaces.activeSpaceOf(locals.did);
	return { activeSpaceId: active?.id };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const hostDid = requireNagiUser(locals);
		const form = await request.formData();
		const rawTitle = String(form.get('title') ?? '');
		const kind = form.get('kind');
		const title = validateTitle(rawTitle);
		if (!title.ok) return fail(400, { title: rawTitle, kind, error: title.reason });
		if (!isSpaceKind(kind)) return fail(400, { title: rawTitle, kind, error: 'kind' as const });

		const { spaces, rooms, redis } = await getRuntime();
		// botたんSpace は botたんに空きが無ければ作らない（LIFE-02）
		if (kind === 'bot' && !(await isBotAvailable(redis))) {
			return fail(409, { title: rawTitle, kind, error: 'botBusy' as const });
		}

		const space: Space = {
			id: newSpaceId(),
			kind,
			hostDid,
			host: locals.profile ?? { did: hostDid, handle: hostDid },
			title: title.title,
			startedAt: new Date().toISOString()
		};
		const created = await spaces.create(space);
		if (!created.ok) redirect(303, `/s/${created.activeSpaceId}`);
		try {
			await rooms.createRoom(space);
		} catch (cause) {
			console.warn('[space] room creation failed', cause instanceof Error ? cause.message : cause);
			await spaces.end(space.id);
			return fail(502, { title: rawTitle, kind, error: 'roomFailed' as const });
		}
		redirect(303, `/s/${space.id}`);
	}
};
