import type { BrowserContext } from '@playwright/test';
import { SecretBox } from '../../../src/lib/server/crypto.ts';
import { PostgrestStore } from '../../../src/lib/server/store/postgrest.ts';
import { e2eEnv } from '../../../playwright.config.ts';

/** E2E から保存先を直接読み書きする（ローカルの PostgREST）。 */
export const db = new PostgrestStore({
	url: e2eEnv.DB_URL,
	schema: 'nagi_space',
	jwt: e2eEnv.POSTGREST_JWT
});

/**
 * 実際のPDSでのログインは自動化しない（手動で確認する）。E2Eでは、ログインが
 * 成功したあとの状態（アプリのセッションと暗号化したOAuthセッション）を保存先に直接作る。
 */
export async function signIn(context: BrowserContext, did: string): Promise<string> {
	const sessionId = `e2e-${crypto.randomUUID()}`;
	const box = new SecretBox(e2eEnv.SESSION_SECRET);
	await db.set(`app:session:${sessionId}`, JSON.stringify({ did }), { ttlSeconds: 600 });
	await db.set(`oauth:session:${did}`, box.seal(JSON.stringify({ e2e: true })), {
		ttlSeconds: 600
	});
	await context.addCookies([
		{ name: 'ns_sid', value: sessionId, url: e2eEnv.PUBLIC_ORIGIN, httpOnly: true, sameSite: 'Lax' }
	]);
	return sessionId;
}

export async function revokeOAuthSession(did: string): Promise<void> {
	await db.del(`oauth:session:${did}`);
}
