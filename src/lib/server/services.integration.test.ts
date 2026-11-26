import { describe, expect, it } from 'vitest';
import { loadServiceConfig } from './config';
import { createRoomService, livekitHttpUrl } from './services';

describe('livekitHttpUrl', () => {
	it('ws(s) を http(s) に直す', () => {
		expect(livekitHttpUrl('wss://example.livekit.cloud')).toBe('https://example.livekit.cloud');
		expect(livekitHttpUrl('ws://127.0.0.1:7880')).toBe('http://127.0.0.1:7880');
		expect(livekitHttpUrl('https://example.com')).toBe('https://example.com');
	});
});

// 実サービスへの疎通確認。INTEGRATION=1 のときだけ動かす（npm run test:integration）。
describe.runIf(process.env.INTEGRATION === '1')('LiveKit への疎通', () => {
	it('room を作成・削除できる', async () => {
		const rooms = createRoomService(loadServiceConfig(process.env));
		const name = `integration-${crypto.randomUUID()}`;
		const room = await rooms.createRoom({ name, emptyTimeout: 10 });
		expect(room.name).toBe(name);
		await rooms.deleteRoom(name);
	});
});
