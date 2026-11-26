import { fail, redirect } from '@sveltejs/kit';
import { canCreateSpace } from '#lib/server/allowlist.ts';
import { isBotAvailable } from '#lib/server/bot/capacity.ts';
import { requireNagiUser } from '#lib/server/nagi.ts';
import {
	SHARE_DRAFT_TTL_SECONDS,
	buildSharePost,
	shareDraftKey,
	shareToNagi,
	validateShareText
} from '#lib/server/share.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceKind, newSpaceId, validateTitle, type Space } from '#lib/server/spaces/model.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.did) redirect(303, '/login?returnTo=%2Fspaces%2Fnew');
	if (locals.nagiUser !== 'registered') redirect(303, '/');
	const { spaces, creatorAllowlist } = await getRuntime();
	const active = await spaces.activeSpaceOf(locals.did);
	return { activeSpaceId: active?.id, canCreate: canCreateSpace(creatorAllowlist, locals.did) };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const hostDid = requireNagiUser(locals);
		if (!canCreateSpace((await getRuntime()).creatorAllowlist, hostDid)) {
			return fail(403, { error: 'notAllowed' as const });
		}
		const form = await request.formData();
		const rawTitle = String(form.get('title') ?? '');
		const kind = form.get('kind');
		const rawShareText = String(form.get('shareText') ?? '');
		const echo = {
			title: rawTitle,
			kind,
			shareText: rawShareText,
			share: form.get('share') === 'on'
		};
		const title = validateTitle(rawTitle);
		if (!title.ok) return fail(400, { ...echo, error: title.reason });
		if (!isSpaceKind(kind)) return fail(400, { ...echo, error: 'kind' as const });
		// botたんSpace はシェアしない（LIFE-02）
		const wantsShare = kind === 'public' && echo.share;
		const shareText = wantsShare ? validateShareText(rawShareText) : undefined;
		if (shareText && !shareText.ok) {
			return fail(400, {
				...echo,
				error: shareText.reason === 'empty' ? ('shareEmpty' as const) : ('shareTooLong' as const)
			});
		}

		const { spaces, rooms, store, oauth, auth } = await getRuntime();
		// botたんSpace は botたんに空きが無ければ作らない（LIFE-02）
		if (kind === 'bot' && !(await isBotAvailable(store))) {
			return fail(409, { ...echo, error: 'botBusy' as const });
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
			return fail(502, { ...echo, error: 'roomFailed' as const });
		}

		// シェアに失敗しても Space は止めない。本文を覚えておき、Space の画面から再試行できるようにする（LIFE-04）
		if (shareText?.ok) {
			const record = buildSharePost({
				text: shareText.text,
				spaceUrl: new URL(`/s/${space.id}`, auth.origin).href,
				title: space.title,
				hostName: space.host.displayName ?? space.host.handle,
				locale: locals.locale
			});
			try {
				await shareToNagi(await oauth.restore(hostDid), record);
			} catch (cause) {
				console.warn('[share] failed', cause instanceof Error ? cause.message : cause);
				await store.set(shareDraftKey(space.id), shareText.text, {
					ttlSeconds: SHARE_DRAFT_TTL_SECONDS
				});
			}
		}
		redirect(303, `/s/${space.id}`);
	}
};
