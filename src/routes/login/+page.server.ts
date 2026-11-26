import { fail, redirect } from '@sveltejs/kit';
import { getRuntime } from '#lib/server/runtime.ts';
import { safeReturnTo } from '#lib/server/session.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals, url }) => {
	const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
	if (locals.did) redirect(303, returnTo);
	const error: 'callback' | undefined =
		url.searchParams.get('error') === 'callback' ? 'callback' : undefined;
	return { returnTo, error };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const form = await request.formData();
		const handle = String(form.get('handle') ?? '')
			.trim()
			.replace(/^@/, '');
		const returnTo = safeReturnTo(String(form.get('returnTo') ?? ''));
		if (!handle) return fail(400, { handle, error: 'handle' as const });

		const { oauth } = await getRuntime();
		let url: URL;
		try {
			url = await oauth.authorize(handle, { state: JSON.stringify({ returnTo }) });
		} catch (cause) {
			console.warn('[oauth] authorize failed', cause instanceof Error ? cause.message : cause);
			return fail(400, { handle, error: 'authorize' as const });
		}
		// 利用者のPDSの認可画面へ移る
		redirect(303, url.href, { external: true });
	}
};
