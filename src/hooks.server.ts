import type { Handle } from '@sveltejs/kit/hooks';
import { detectLocale } from '#lib/i18n/messages.ts';
import { REGISTRATION_PREFIX } from '#lib/server/nagi.ts';
import { OAUTH_SESSION_PREFIX } from '#lib/server/oauth/stores.ts';
import { getRuntime } from '#lib/server/runtime.ts';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.locale = detectLocale(event.request.headers.get('accept-language'));
	event.locals.nagiUser = 'anonymous';
	const { sessions, store, checkRegistration } = await getRuntime();

	// 保存先の失敗はそのまま投げてエラー応答にする。一時的な失敗でログアウトさせない（ACC-04）。
	const session = await sessions.read(event.cookies);
	if (session) {
		// 自宅DBへの往復を減らすため、OAuth セッションの有無と登録の確認を1回で読む（design.md D1）
		const oauthKey = OAUTH_SESSION_PREFIX + session.did;
		const registrationKey = REGISTRATION_PREFIX + session.did;
		const found = await store.getMany([oauthKey, registrationKey]);
		// PDS 側で認可が取り消されるなどして OAuth セッションが無くなっていたら、ログアウト扱いにする。
		if (found.has(oauthKey)) event.locals.did = session.did;
		else await sessions.destroy(event.cookies);

		if (event.locals.did) {
			// AppView に確認できなくても未登録とはみなさない（ACC-02）
			const result = await checkRegistration(
				event.locals.did,
				found.get(registrationKey) ?? null
			).catch((cause: unknown) => {
				console.warn(
					'[nagi] registration check failed',
					cause instanceof Error ? cause.message : cause
				);
				return undefined;
			});
			event.locals.nagiUser = result?.registration ?? 'unknown';
			event.locals.profile = result?.profile;
		}
	}
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', event.locals.locale)
	});
};
