import { expect, test } from '@playwright/test';
import { signIn } from './fixtures/session.ts';
import { cleanup } from './fixtures/space.ts';

test.use({ locale: 'ja-JP' });

// ACC-03 未ログインで共有リンクを開く
test('未ログインではタイトルとホストとログインの案内だけを表示し、音声に接続しない', async ({
	browser
}) => {
	const hostDid = `did:plc:member${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
	const hostContext = await browser.newContext({ locale: 'ja-JP' });
	await signIn(hostContext, hostDid);
	const hostPage = await hostContext.newPage();
	await hostPage.goto('/spaces/new');
	await hostPage.getByLabel('タイトル').fill('だれでもどうぞ');
	await hostPage.getByRole('button', { name: '開始する' }).click();
	await expect(hostPage).toHaveURL(/\/s\//, { timeout: 15000 });
	const path = new URL(hostPage.url()).pathname;

	const anonymous = await browser.newContext({ locale: 'ja-JP' });
	const page = await anonymous.newPage();
	const tokenRequests: string[] = [];
	page.on('request', (request) => {
		if (request.url().endsWith('/token')) tokenRequests.push(request.url());
	});
	await page.goto(path);
	await expect(page.getByTestId('space-title')).toHaveText('だれでもどうぞ');
	await expect(page.getByTestId('space-host')).toContainText('ホスト');
	await expect(page.getByRole('link', { name: 'ログインして参加する' })).toHaveAttribute(
		'href',
		`/login?returnTo=${encodeURIComponent(path)}`
	);
	await expect(page.getByTestId('participants')).toHaveCount(0);
	expect(tokenRequests).toHaveLength(0);
	// 未ログインのトークン要求は拒否される
	const response = await page.request.post(`${path}/token`, {
		headers: { origin: new URL(page.url()).origin }
	});
	expect(response.status()).toBe(401);

	await cleanup(hostDid);
});
