import { expect, test } from '@playwright/test';
import { db, revokeOAuthSession, signIn } from './fixtures/session.ts';
import { cleanup, resetBotCapacity, setBotCapacity } from './fixtures/space.ts';

test.use({ locale: 'ja-JP' });

const memberDid = () => `did:plc:member${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

const endHostSpace = (did: string) => cleanup(did);

// LIFE-01 パブリックSpaceを作成する
test('パブリックSpaceを作成するとホストとして入室する', async ({ context, page }) => {
	const did = memberDid();
	await signIn(context, did);
	await page.goto('/');
	await page.getByRole('link', { name: 'Space を始める' }).click();
	await page.getByLabel('タイトル').fill('  はじめての  Space ');
	await page.getByRole('button', { name: '開始する' }).click();

	await expect(page).toHaveURL(/\/s\/[a-z2-9]{12}$/, { timeout: 15000 });
	await expect(page.getByTestId('space-title')).toHaveText('はじめての Space');
	await expect(page.getByTestId('connection-state')).toHaveText('接続しました', { timeout: 15000 });
	const me = page.getByTestId('participants').locator('li');
	await expect(me).toHaveCount(1);
	await expect(me.first()).toHaveAttribute('data-role', 'host');
	await expect(page.getByRole('button', { name: 'マイクをオンにする' })).toBeVisible();

	await endHostSpace(did);
	await revokeOAuthSession(did);
});

// LIFE-01 開催中にもう1つ作成しようとする
test('開催中のホストは2つ目を作れず、開催中のSpaceへ案内される', async ({ context, page }) => {
	const did = memberDid();
	await signIn(context, did);
	await page.goto('/spaces/new');
	await page.getByLabel('タイトル').fill('ひとつめ');
	await page.getByRole('button', { name: '開始する' }).click();
	await expect(page).toHaveURL(/\/s\//, { timeout: 15000 });
	const firstUrl = page.url();

	await page.goto('/spaces/new');
	await expect(page.getByTestId('active-space')).toBeVisible();
	await page.getByRole('link', { name: '開催中の Space に戻る' }).click();
	await expect(page).toHaveURL(firstUrl);

	await endHostSpace(did);
	await revokeOAuthSession(did);
});

test('空白だけのタイトルでは作成しない', async ({ context, page }) => {
	const did = memberDid();
	await signIn(context, did);
	await page.goto('/spaces/new');
	await page.getByLabel('タイトル').fill('   ');
	await page.getByRole('button', { name: '開始する' }).click();
	await expect(page.getByRole('alert')).toHaveText('タイトルを入力してください。');
	expect(await db.get(`space:host:${did}`)).toBeUndefined();
	await revokeOAuthSession(did);
});

// LIFE-02 botたんに空きが無いときに作成する
test('botたんに空きが無ければbotたんSpaceを作らない', async ({ context, page }) => {
	const did = memberDid();
	await signIn(context, did);
	await setBotCapacity(0);
	await page.goto('/spaces/new');
	await page.getByLabel('タイトル').fill('botたんとおしゃべり');
	await page.getByLabel('botたんSpace').check();
	await page.getByRole('button', { name: '開始する' }).click();
	await expect(page.getByRole('alert')).toContainText('botたんは今いっぱいです');
	expect(await db.get(`space:host:${did}`)).toBeUndefined();
	await revokeOAuthSession(did);
});

// LIFE-02 他の利用者がbotたんSpaceのURLを開く / ACC-03
test('botたんSpaceはホスト以外には存在しないのと同じに見える', async ({ browser }) => {
	const hostDid = memberDid();
	const hostContext = await browser.newContext({ locale: 'ja-JP' });
	await signIn(hostContext, hostDid);
	await setBotCapacity(1);
	const hostPage = await hostContext.newPage();
	await hostPage.goto('/spaces/new');
	await hostPage.getByLabel('タイトル').fill('ないしょ');
	await hostPage.getByLabel('botたんSpace').check();
	await hostPage.getByRole('button', { name: '開始する' }).click();
	await expect(hostPage).toHaveURL(/\/s\//, { timeout: 15000 });
	const url = new URL(hostPage.url()).pathname;

	const otherDid = memberDid();
	const otherContext = await browser.newContext({ locale: 'ja-JP' });
	await signIn(otherContext, otherDid);
	const otherPage = await otherContext.newPage();
	await otherPage.goto(url);
	await expect(otherPage.getByTestId('not-found')).toBeVisible();
	const token = await otherPage.request.post(`${url}/token`, {
		headers: { origin: new URL(otherPage.url()).origin }
	});
	expect(token.status()).toBe(404);

	const anonymous = await browser.newContext({ locale: 'ja-JP' });
	const anonymousPage = await anonymous.newPage();
	await anonymousPage.goto(url);
	await expect(anonymousPage.getByTestId('not-found')).toBeVisible();
	await expect(anonymousPage.getByText('ないしょ')).toHaveCount(0);

	await resetBotCapacity();
	await endHostSpace(hostDid);
	await revokeOAuthSession(hostDid);
	await revokeOAuthSession(otherDid);
});
