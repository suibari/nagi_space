import { error } from '@sveltejs/kit';
import { LOCALE_COOKIE, isLocale } from '#lib/i18n/messages.ts';
import type { RequestHandler } from './$types';

/** 表示言語をこの端末に保存する（LOOK-06）。サーバーが最初から選んだ言語で描けるよう cookie に置く。 */
export const POST: RequestHandler = async ({ request, cookies, url }) => {
	const body = (await request.json().catch(() => ({}))) as { locale?: unknown };
	if (!isLocale(body.locale)) error(400, 'Invalid locale');
	cookies.set(LOCALE_COOKIE, body.locale, {
		path: '/',
		maxAge: 60 * 60 * 24 * 365,
		sameSite: 'lax',
		httpOnly: false,
		secure: url.protocol === 'https:'
	});
	return new Response(null, { status: 204 });
};
