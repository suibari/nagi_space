import type { RedisClientType } from 'redis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadServiceConfig } from '../config';
import { connectRedis } from '../services';
import { newSpaceId, type Space } from './model';
import { SpaceRepository } from './repository';

const makeSpace = (hostDid: string, kind: Space['kind'] = 'public'): Space => ({
	id: newSpaceId(),
	kind,
	hostDid,
	host: { did: hostDid, handle: 'host.test' },
	title: 'テスト',
	startedAt: new Date().toISOString()
});

describe.runIf(process.env.INTEGRATION === '1')('SpaceRepository（Redis）', () => {
	let redis: RedisClientType;
	let repo: SpaceRepository;
	const host = () => `did:plc:repo${crypto.randomUUID()}`;

	beforeAll(async () => {
		redis = await connectRedis(loadServiceConfig(process.env));
		repo = new SpaceRepository(redis);
	});
	afterAll(async () => {
		await redis.quit();
	});

	it('1人が同時に開催できるのは1つまで（LIFE-01）', async () => {
		const did = host();
		const first = makeSpace(did);
		expect((await repo.create(first)).ok).toBe(true);
		expect(await repo.create(makeSpace(did))).toEqual({ ok: false, activeSpaceId: first.id });
		await repo.end(first.id);
		expect((await repo.create(makeSpace(did))).ok).toBe(true);
	});

	it('同時に作成しても1つしか通らない', async () => {
		const did = host();
		const results = await Promise.all([repo.create(makeSpace(did)), repo.create(makeSpace(did))]);
		expect(results.filter((result) => result.ok)).toHaveLength(1);
	});

	it('パブリックSpaceだけを開催中の一覧に出し、終了したら外す', async () => {
		const pub = makeSpace(host());
		const bot = makeSpace(host(), 'bot');
		await repo.create(pub);
		await repo.create(bot);
		const ids = (await repo.listLivePublic()).map((space) => space.id);
		expect(ids).toContain(pub.id);
		expect(ids).not.toContain(bot.id);

		const ended = await repo.end(pub.id);
		expect(ended?.endedAt).toBeTruthy();
		expect((await repo.listLivePublic()).map((space) => space.id)).not.toContain(pub.id);
		// 開催情報だけを期限付きで残す（LIFE-07・design.md D9）
		expect((await repo.get(pub.id))?.endedAt).toBeTruthy();
		expect(await redis.ttl(`space:${pub.id}`)).toBeGreaterThan(0);
		await repo.end(bot.id);
	});
});
