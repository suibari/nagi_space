import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { createIssuer } from '@suibari/nagi-passport/issuer';
import { e2eEnv } from '../../playwright.config.ts';

// 実在するアカウント（bsky.app）のDID。認可画面への移動までを確かめ、ログインはしない。
const DID = 'did:plc:z72i7hdynmk6r22z27h6tvur';
const keys = JSON.parse(
	readFileSync(new URL('./fixtures/passport-keys.json', import.meta.url), 'utf8')
);

async function issueTicket(audience = e2eEnv.PUBLIC_ORIGIN) {
	const issuer = createIssuer({
		issuer: e2eEnv.NAGI_PASSPORT_ISSUER,
		privateJwk: keys.privateJwk,
		audiences: [audience]
	});
	return (await issuer.createTicket({ did: DID, audience })).ticket;
}

function authorizeLocation(response: { status(): number; headers(): Record<string, string> }) {
	expect(response.status()).toBe(303);
	return new URL(response.headers().location, e2eEnv.PUBLIC_ORIGIN);
}

// ACC-01 NagiからSSOで移動する
test('正しいチケットではハンドルを入力せずに認可画面へ進む', async ({ request }) => {
	const ticket = await issueTicket();
	const response = await request.get(`/sso?ticket=${ticket}&return_to=%2Fs%2Fabc`, {
		maxRedirects: 0
	});
	const location = authorizeLocation(response);
	expect(location.href).toMatch(/\/oauth\/authorize\?/);
	expect(response.headers()['cache-control']).toContain('no-store');
});

// ACC-01 SSOチケットの取得に失敗する
test('無効・再提示のチケットではログイン画面へ戻り、戻り先を保つ', async ({ request }) => {
	const ticket = await issueTicket();
	await request.get(`/sso?ticket=${ticket}`, { maxRedirects: 0 });
	for (const bad of [ticket, 'broken', await issueTicket('https://room.example')]) {
		const response = await request.get(`/sso?ticket=${bad}&return_to=%2Fs%2Fabc`, {
			maxRedirects: 0
		});
		const location = authorizeLocation(response);
		expect(location.pathname).toBe('/login');
		expect(location.searchParams.get('returnTo')).toBe('/s/abc');
	}
});
