import { beforeAll, describe, expect, it } from 'vitest';
import type { ServiceConfig } from './config';
import { loadServiceConfig } from './config';
import { connectRedis, createRoomService, livekitHttpUrl } from './services';

describe('livekitHttpUrl', () => {
	it('ws(s) を http(s) に直す', () => {
		expect(livekitHttpUrl('wss://example.livekit.cloud')).toBe('https://example.livekit.cloud');
		expect(livekitHttpUrl('ws://127.0.0.1:7880')).toBe('http://127.0.0.1:7880');
		expect(livekitHttpUrl('https://example.com')).toBe('https://example.com');
	});
});

// 実サービスへの疎通確認。INTEGRATION=1 のときだけ動かす（npm run test:integration）。
describe.runIf(process.env.INTEGRATION === '1')('外部サービスへの疎通', () => {
	let config: ServiceConfig;
	beforeAll(() => {
		config = loadServiceConfig(process.env);
	});

	it('LiveKit で room を作成・削除できる', async () => {
		const rooms = createRoomService(config);
		const name = `integration-${crypto.randomUUID()}`;
		const room = await rooms.createRoom({ name, emptyTimeout: 10 });
		expect(room.name).toBe(name);
		await rooms.deleteRoom(name);
	});

	it('Redis に読み書きできる', async () => {
		const redis = await connectRedis(config);
		const key = `integration:${crypto.randomUUID()}`;
		try {
			await redis.set(key, 'ok', { EX: 10 });
			expect(await redis.get(key)).toBe('ok');
		} finally {
			await redis.del(key);
			await redis.quit();
		}
	});
});
