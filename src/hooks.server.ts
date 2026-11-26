import type { Handle } from '@sveltejs/kit/hooks';
import { detectLocale } from '#lib/i18n/messages.ts';
import { getRuntime } from '#lib/server/runtime.ts';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.locale = detectLocale(event.request.headers.get('accept-language'));
	const { sessions, oauthSessions, checkRegistration } = await getRuntime();
	event.locals.nagiUser = 'anonymous';
	// Redis の失敗はそのまま投げてエラー応答にする。一時的な失敗でログアウトさせない（ACC-04）。
	const session = await sessions.read(event.cookies);
	if (session) {
		// PDS 側で認可が取り消されるなどして OAuth セッションが無くなっていたら、ログアウト扱いにする。
		if (await oauthSessions.get(session.did)) event.locals.did = session.did;
		else await sessions.destroy(event.cookies);
	}
	if (event.locals.did) {
		// AppView に確認できなくても未登録とはみなさない（ACC-02）
		event.locals.nagiUser = await checkRegistration(event.locals.did).catch((cause: unknown) => {
			console.warn(
				'[nagi] registration check failed',
				cause instanceof Error ? cause.message : cause
			);
			return 'unknown' as const;
		});
	}
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
};
