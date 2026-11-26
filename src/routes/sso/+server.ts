import { redirect } from '@sveltejs/kit';
import { verifyTicket } from '#lib/server/passport.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { safeReturnTo } from '#lib/server/session.ts';
import type { RequestHandler } from './$types';

/**
 * Nagi からの移動（ACC-01）。チケットは利用者のDIDを確かめるためだけに使い、
 * そのDIDで本アプリのOAuth認可へ進む。チケットだけでセッションは作らない（design.md D2）。
 */
export const GET: RequestHandler = async ({ url, locals, setHeaders }) => {
	// チケット付きの URL をキャッシュ・共有させない
	setHeaders({ 'cache-control': 'no-store' });
	const returnTo = safeReturnTo(url.searchParams.get('return_to'));
	if (locals.did) redirect(303, returnTo);

	const ticket = url.searchParams.get('ticket');
	const { oauth, sso } = await getRuntime();
	const did = ticket ? await verifyTicket(sso, ticket) : undefined;
	if (!did) redirect(303, `/login?returnTo=${encodeURIComponent(returnTo)}`);

	let authorizeUrl: URL;
	try {
		authorizeUrl = await oauth.authorize(did, { state: JSON.stringify({ returnTo }) });
	} catch (cause) {
		console.warn('[sso] authorize failed', cause instanceof Error ? cause.message : cause);
		redirect(303, `/login?returnTo=${encodeURIComponent(returnTo)}`);
	}
	redirect(303, authorizeUrl.href, { external: true });
};
