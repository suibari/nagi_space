import { describe, expect, it } from 'vitest';
import { ConfigError, loadServiceConfig } from './config';

const complete = {
	LIVEKIT_URL: 'ws://127.0.0.1:7880',
	LIVEKIT_API_KEY: 'devkey',
	LIVEKIT_API_SECRET: 'secret',
	DB_URL: 'http://127.0.0.1:3399'
};

describe('loadServiceConfig', () => {
	it('環境変数から接続先を読み、スキーマの既定は nagi_space', () => {
		expect(loadServiceConfig(complete)).toEqual({
			livekit: { url: 'ws://127.0.0.1:7880', apiKey: 'devkey', apiSecret: 'secret' },
			db: {
				url: 'http://127.0.0.1:3399',
				schema: 'nagi_space',
				jwt: undefined,
				cfAccess: undefined
			}
		});
	});

	it('Cloudflare Access のトークンは2つそろったときだけ使う', () => {
		const withOne = loadServiceConfig({ ...complete, CF_ACCESS_CLIENT_ID_DB: 'id' });
		expect(withOne.db.cfAccess).toBeUndefined();
		const withBoth = loadServiceConfig({
			...complete,
			CF_ACCESS_CLIENT_ID_DB: 'id',
			CF_ACCESS_CLIENT_SECRET_DB: 'secret',
			POSTGREST_JWT: 'jwt'
		});
		expect(withBoth.db).toMatchObject({
			jwt: 'jwt',
			cfAccess: { clientId: 'id', clientSecret: 'secret' }
		});
	});

	it('足りない変数をすべて挙げて失敗する', () => {
		expect(() =>
			loadServiceConfig({ ...complete, LIVEKIT_API_KEY: ' ', DB_URL: undefined })
		).toThrow(new ConfigError(['LIVEKIT_API_KEY', 'DB_URL']));
	});
});
