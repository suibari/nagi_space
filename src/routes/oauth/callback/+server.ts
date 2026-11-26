import { redirect } from '@sveltejs/kit';
import { getRuntime } from '#lib/server/runtime.ts';
import { safeReturnTo } from '#lib/server/session.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, cookies }) => {
	const { oauth, sessions } = await getRuntime();
	let returnTo = '/';
	try {
		const { session, state } = await oauth.callback(url.searchParams);
		returnTo = safeReturnTo(state ? (JSON.parse(state) as { returnTo?: string }).returnTo : null);
		await sessions.create(cookies, { did: session.did });
	} catch (cause) {
		console.warn('[oauth] callback failed', cause instanceof Error ? cause.message : cause);
		redirect(303, `/login?error=callback&returnTo=${encodeURIComponent(returnTo)}`);
	}
	redirect(303, returnTo);
};
