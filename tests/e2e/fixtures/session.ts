import type { BrowserContext } from '@playwright/test';
import { createClient } from 'redis';
import { SecretBox } from '../../../src/lib/server/crypto.ts';
import { e2eEnv } from '../../../playwright.config.ts';

/**
 * 実際のPDSでのログインは自動化しない（手動で確認する）。E2Eでは、ログインが
 * 成功したあとの状態（アプリのセッションと暗号化したOAuthセッション）をRedisに直接作る。
 */
export async function withRedis<T>(fn: (redis: ReturnType<typeof createClient>) => Promise<T>) {
	const redis = createClient({ url: e2eEnv.REDIS_URL });
	await redis.connect();
	try {
		return await fn(redis);
	} finally {
		await redis.quit();
	}
}

export async function signIn(context: BrowserContext, did: string): Promise<string> {
	const sessionId = `e2e-${crypto.randomUUID()}`;
	const box = new SecretBox(e2eEnv.SESSION_SECRET);
	await withRedis(async (redis) => {
		await redis.set(`app:session:${sessionId}`, JSON.stringify({ did }), { EX: 600 });
		await redis.set(`oauth:session:${did}`, box.seal(JSON.stringify({ e2e: true })), { EX: 600 });
	});
	await context.addCookies([
		{ name: 'ns_sid', value: sessionId, url: e2eEnv.PUBLIC_ORIGIN, httpOnly: true, sameSite: 'Lax' }
	]);
	return sessionId;
}

export async function revokeOAuthSession(did: string): Promise<void> {
	await withRedis((redis) => redis.del(`oauth:session:${did}`));
}
