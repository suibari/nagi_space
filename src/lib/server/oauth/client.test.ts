import { describe, expect, it } from 'vitest';
import { buildClientMetadata, isLoopbackOrigin } from './client';
import { OAUTH_SCOPE } from './scope';

describe('isLoopbackOrigin', () => {
	it('http の 127.0.0.1 と [::1] だけをループバックとみなす', () => {
		expect(isLoopbackOrigin('http://127.0.0.1:5173')).toBe(true);
		expect(isLoopbackOrigin('http://[::1]:5173')).toBe(true);
		expect(isLoopbackOrigin('http://localhost:5173')).toBe(false);
		expect(isLoopbackOrigin('https://space.example.com')).toBe(false);
	});
});

describe('buildClientMetadata', () => {
	it('本番は private_key_jwt の confidential client にする', () => {
		const metadata = buildClientMetadata('https://space.example.com');
		expect(metadata).toMatchObject({
			client_id: 'https://space.example.com/oauth-client-metadata.json',
			redirect_uris: ['https://space.example.com/oauth/callback'],
			jwks_uri: 'https://space.example.com/jwks.json',
			token_endpoint_auth_method: 'private_key_jwt',
			scope: OAUTH_SCOPE,
			dpop_bound_access_tokens: true
		});
	});

	it('ローカル開発はループバッククライアントにし、スコープと callback を client_id に含める', () => {
		const metadata = buildClientMetadata('http://127.0.0.1:5173');
		const clientId = metadata.client_id ?? '';
		expect(clientId.startsWith('http://localhost')).toBe(true);
		const params = new URL(clientId).searchParams;
		expect(params.get('scope')).toBe(OAUTH_SCOPE);
		expect(params.get('redirect_uri')).toBe('http://127.0.0.1:5173/oauth/callback');
		expect(metadata.token_endpoint_auth_method).toBe('none');
	});
});
