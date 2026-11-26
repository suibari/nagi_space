import type { Cookies } from '@sveltejs/kit';
import type { RedisClientType } from 'redis';

export const SESSION_COOKIE = 'ns_sid';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const KEY_PREFIX = 'app:session:';

export type AppSession = { did: string };

/**
 * ブラウザとの間のセッション。cookie には乱数のIDだけを置き、DIDはサーバー側に持つ。
 * OAuth のトークンは別に暗号化して保存している（oauth/stores.ts）。
 */
export class SessionManager {
	constructor(
		private readonly redis: RedisClientType,
		private readonly secureCookie: boolean
	) {}

	async create(cookies: Cookies, session: AppSession): Promise<void> {
		const id = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
		await this.redis.set(KEY_PREFIX + id, JSON.stringify(session), { EX: SESSION_TTL_SECONDS });
		cookies.set(SESSION_COOKIE, id, {
			path: '/',
			httpOnly: true,
			secure: this.secureCookie,
			sameSite: 'lax',
			maxAge: SESSION_TTL_SECONDS
		});
	}

	/** cookie のセッションを読む。見つからなければ cookie を消す。通信の失敗は呼び出し側へ投げる。 */
	async read(cookies: Cookies): Promise<AppSession | undefined> {
		const id = cookies.get(SESSION_COOKIE);
		if (!id) return undefined;
		const raw = await this.redis.get(KEY_PREFIX + id);
		if (!raw) {
			cookies.delete(SESSION_COOKIE, { path: '/' });
			return undefined;
		}
		// 使っている間は期限を延ばす
		await this.redis.expire(KEY_PREFIX + id, SESSION_TTL_SECONDS);
		return JSON.parse(raw) as AppSession;
	}

	async destroy(cookies: Cookies): Promise<void> {
		const id = cookies.get(SESSION_COOKIE);
		if (id) await this.redis.del(KEY_PREFIX + id);
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
