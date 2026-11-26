import type { Cookies } from '@sveltejs/kit';
import type { RedisClientType } from 'redis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadServiceConfig } from './config';
import { SecretBox } from './crypto';
import { createRequestLock, createSessionStore, createStateStore } from './oauth/stores';
import { connectRedis } from './services';
import { SESSION_COOKIE, SessionManager } from './session';

function fakeCookies(): Cookies & { jar: Map<string, string> } {
	const jar = new Map<string, string>();
	return {
		jar,
		get: (name: string) => jar.get(name),
		getAll: () => [...jar].map(([name, value]) => ({ name, value })),
		set: (name: string, value: string) => void jar.set(name, value),
		delete: (name: string) => void jar.delete(name),
		serialize: () => ''
	} as unknown as Cookies & { jar: Map<string, string> };
}

// 実際の Redis を使う。INTEGRATION=1 のときだけ動かす（npm run test:integration）。
describe.runIf(process.env.INTEGRATION === '1')('認証の保存（Redis）', () => {
	let redis: RedisClientType;
	const box = new SecretBox('integration-secret-that-is-long-enough');

	beforeAll(async () => {
		redis = await connectRedis(loadServiceConfig(process.env));
	});
	afterAll(async () => {
		await redis.quit();
	});

	it('OAuth セッションを暗号化して保存し、読み戻せる', async () => {
		const store = createSessionStore(redis, box);
		const sub = `did:plc:test${crypto.randomUUID()}`;
		const value = { tokenSet: { access_token: 'secret-token' } } as never;
		await store.set(sub, value);
		expect(await redis.get(`oauth:session:${sub}`)).not.toContain('secret-token');
		expect(await store.get(sub)).toEqual(value);
		await store.del(sub);
		expect(await store.get(sub)).toBeUndefined();
	});

	it('認可途中の状態には期限を付ける', async () => {
		const store = createStateStore(redis, box);
		const key = crypto.randomUUID();
		await store.set(key, { iss: 'https://example.com' } as never);
		expect(await redis.ttl(`oauth:state:${key}`)).toBeGreaterThan(0);
		await store.del(key);
	});

	it('ロックは同じ名前の処理を順番に実行する', async () => {
		const lock = createRequestLock(redis);
		const name = crypto.randomUUID();
		const order: string[] = [];
		await Promise.all([
			lock(name, async () => {
				order.push('a:start');
				await new Promise((resolve) => setTimeout(resolve, 150));
				order.push('a:end');
			}),
			new Promise((resolve) => setTimeout(resolve, 20)).then(() =>
				lock(name, async () => {
					order.push('b');
				})
			)
		]);
		expect(order).toEqual(['a:start', 'a:end', 'b']);
	});

	it('cookie のセッションを作成・読み取り・破棄できる', async () => {
		const sessions = new SessionManager(redis, false);
		const cookies = fakeCookies();
		await sessions.create(cookies, { did: 'did:plc:alice' });
		expect(cookies.jar.get(SESSION_COOKIE)).toBeTruthy();
		expect(await sessions.read(cookies)).toEqual({ did: 'did:plc:alice' });
		await sessions.destroy(cookies);
		expect(cookies.jar.has(SESSION_COOKIE)).toBe(false);
		expect(await sessions.read(cookies)).toBeUndefined();
	});

	it('サーバーに無いセッションの cookie は消す', async () => {
		const sessions = new SessionManager(redis, false);
		const cookies = fakeCookies();
		cookies.set(SESSION_COOKIE, 'unknown', { path: '/' });
		expect(await sessions.read(cookies)).toBeUndefined();
		expect(cookies.jar.has(SESSION_COOKIE)).toBe(false);
	});
});
