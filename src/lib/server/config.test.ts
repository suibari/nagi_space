import { describe, expect, it } from 'vitest';
import { ConfigError, loadServiceConfig } from './config';

const complete = {
	LIVEKIT_URL: 'ws://127.0.0.1:7880',
	LIVEKIT_API_KEY: 'devkey',
	LIVEKIT_API_SECRET: 'secret',
	REDIS_URL: 'redis://127.0.0.1:6379'
};

describe('loadServiceConfig', () => {
	it('環境変数から接続先を読む', () => {
		expect(loadServiceConfig(complete)).toEqual({
			livekit: { url: 'ws://127.0.0.1:7880', apiKey: 'devkey', apiSecret: 'secret' },
			redisUrl: 'redis://127.0.0.1:6379'
		});
	});

	it('足りない変数をすべて挙げて失敗する', () => {
		expect(() =>
			loadServiceConfig({ ...complete, LIVEKIT_API_KEY: ' ', REDIS_URL: undefined })
		).toThrow(new ConfigError(['LIVEKIT_API_KEY', 'REDIS_URL']));
	});
});
