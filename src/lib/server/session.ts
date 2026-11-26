import type { Cookies } from '@sveltejs/kit';
import type { KeyValueStore } from './store/types';

export const SESSION_COOKIE = 'ns_sid';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
export const APP_SESSION_PREFIX = 'app:session:';

export type AppSession = { did: string };

/**
 * ブラウザとの間のセッション。cookie には乱数のIDだけを置き、DIDはサーバー側に持つ。
 * OAuth のトークンは別に暗号化して保存している（oauth/stores.ts）。
 */
export class SessionManager {
	constructor(
		private readonly store: KeyValueStore,
		private readonly secureCookie: boolean
	) {}

	async create(cookies: Cookies, session: AppSession): Promise<void> {
		const id = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
		await this.store.set(APP_SESSION_PREFIX + id, JSON.stringify(session), {
			ttlSeconds: SESSION_TTL_SECONDS
		});
		cookies.set(SESSION_COOKIE, id, {
			path: '/',
			httpOnly: true,
			secure: this.secureCookie,
			sameSite: 'lax',
			maxAge: SESSION_TTL_SECONDS
		});
	}

	/** cookie のセッションを読み、使っている間は期限を延ばす。見つからなければ cookie を消す。 */
	async read(cookies: Cookies): Promise<AppSession | undefined> {
		const id = cookies.get(SESSION_COOKIE);
		if (!id) return undefined;
		const raw = await this.store.get(APP_SESSION_PREFIX + id, SESSION_TTL_SECONDS);
		if (!raw) {
			cookies.delete(SESSION_COOKIE, { path: '/' });
			return undefined;
		}
		return JSON.parse(raw) as AppSession;
	}

	async destroy(cookies: Cookies): Promise<void> {
		const id = cookies.get(SESSION_COOKIE);
		if (id) await this.store.del(APP_SESSION_PREFIX + id);
		cookies.delete(SESSION_COOKIE, { path: '/' });
	}
}

/** ログイン後の戻り先。外部サイトへの移動に使われないよう、同じサイト内のパスだけを許す。 */
export function safeReturnTo(value: string | null | undefined): string {
	if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
		return '/';
	}
	return value;
}
