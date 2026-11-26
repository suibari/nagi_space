import { redirect } from '@sveltejs/kit';
import { getRuntime } from '#lib/server/runtime.ts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	const { oauth, sessions } = await getRuntime();
	// TODO(ACC-04): Space の入室を実装したら、ここで先に退室させる（作業4.x）。
	if (locals.did) {
		await oauth.revoke(locals.did).catch((cause: unknown) => {
			console.warn('[oauth] revoke failed', cause instanceof Error ? cause.message : cause);
		});
	}
	await sessions.destroy(cookies);
	redirect(303, '/');
};
