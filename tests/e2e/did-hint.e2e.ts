import { expect, test } from '@playwright/test';
import { e2eEnv } from '../../playwright.config.ts';
import { signIn } from './fixtures/session.ts';
import { cleanup } from './fixtures/space.ts';

// 実在するアカウント（bsky.app）のDID。認可画面への移動までを確かめ、ログインはしない。
const DID = 'did:plc:z72i7hdynmk6r22z27h6tvur';

function redirected(response: { status(): number; headers(): Record<string, string> }) {
	expect(response.status()).toBe(303);
	return new URL(response.headers().location, e2eEnv.PUBLIC_ORIGIN);
}

// ACC-01 NagiからSSOで移動する
test('DIDのヒントが付いたログイン画面は認可画面へ進む', async ({ request }) => {
	const response = await request.get(`/login?did=${DID}`, { maxRedirects: 0 });
	expect(redirected(response).href).toMatch(/\/oauth\/authorize\?/);
});

test('未ログインでヒント付きの共有リンクを開くと、Spaceを戻り先にしてログインへ進む', async ({
	browser,
	request
}) => {
	const hostDid = `did:plc:member${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
	const hostContext = await browser.newContext({ locale: 'ja-JP' });
	await signIn(hostContext, hostDid);
	const hostPage = await hostContext.newPage();
	await hostPage.goto('/spaces/new');
	await hostPage.getByLabel('タイトル').fill('ヒントで来る');
	await hostPage.getByRole('button', { name: '開始する' }).click();
	await expect(hostPage).toHaveURL(/\/s\//, { timeout: 15000 });
	const path = new URL(hostPage.url()).pathname;

	const location = redirected(await request.get(`${path}?did=${DID}`, { maxRedirects: 0 }));
	expect(location.pathname).toBe('/login');
	expect(location.searchParams.get('did')).toBe(DID);
	expect(location.searchParams.get('returnTo')).toBe(path);

	// ログイン済みならヒントは使わず、そのまま Space を表示する
	const signedIn = await hostPage.request.get(`${path}?did=${DID}`, { maxRedirects: 0 });
	expect(signedIn.status()).toBe(200);

	await cleanup(hostDid);
});

test('未ログインでヒント付きのトップを開くと、ログインへ進む', async ({ request }) => {
	const location = redirected(await request.get(`/?did=${DID}`, { maxRedirects: 0 }));
	expect(location.pathname).toBe('/login');
	expect(location.searchParams.get('returnTo')).toBe('/');
});
