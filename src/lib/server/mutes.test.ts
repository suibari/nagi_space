import type { OAuthSession } from '@atproto/oauth-client-node';
import { describe, expect, it } from 'vitest';
import { createMuteChecker, fetchMutedDids } from './mutes';
import type { KeyValueStore } from './store/types';

const sessionReturning = (response: Response) =>
	({ fetchHandler: async () => response }) as unknown as OAuthSession;

function memoryStore(): KeyValueStore {
	const map = new Map<string, string>();
	return {
		get: async (key) => map.get(key),
		getMany: async () => new Map(),
		set: async (key, value) => (map.set(key, value), true),
		del: async (...keys) => keys.forEach((key) => map.delete(key)),
		delIfEquals: async () => false,
		list: async () => [],
		ttl: async () => null
	};
}

describe('fetchMutedDids', () => {
	it('getMutes の actors から DID を取り出す', async () => {
		const session = sessionReturning(
			new Response(
				JSON.stringify({ actors: [{ did: 'did:plc:a' }, { did: 'did:plc:b' }], tags: ['x'] })
			)
		);
		expect(await fetchMutedDids(session)).toEqual(['did:plc:a', 'did:plc:b']);
	});
});

describe('createMuteChecker', () => {
	it('取得した結果を覚え、次は保存先から読む', async () => {
		const store = memoryStore();
		let calls = 0;
		const check = createMuteChecker(store, async () => {
			calls += 1;
			return sessionReturning(new Response(JSON.stringify({ actors: [{ did: 'did:plc:a' }] })));
		});
		expect(await check('did:plc:me')).toEqual(new Set(['did:plc:a']));
		expect(await check('did:plc:me')).toEqual(new Set(['did:plc:a']));
		expect(calls).toBe(1);
	});

	it('取れなかったときは何も隠さない', async () => {
		const check = createMuteChecker(memoryStore(), async () => {
			throw new Error('no session');
		});
		expect(await check('did:plc:me')).toEqual(new Set());
	});
});
