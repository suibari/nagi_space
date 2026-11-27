import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs, setBotCapacity } from './fixtures/space.ts';

const bg = (page: import('@playwright/test').Page) =>
	page.evaluate(() => getComputedStyle(document.body).backgroundColor);

// LOOK-01 Nagiのデフォルトテーマ（bot-mint）
test('ライトはbot-mintの背景色、ダークは暗い背景色になる', async ({ browser }) => {
	const light = await browser.newContext({ colorScheme: 'light' });
	const page = await light.newPage();
	await page.goto('/login');
	expect(await bg(page)).toBe('rgb(247, 249, 249)');
	const dark = await browser.newContext({ colorScheme: 'dark' });
	const darkPage = await dark.newPage();
	await darkPage.goto('/login');
	expect(await bg(darkPage)).toBe('rgb(9, 13, 12)');
});

// LOOK-02 ダークを選んで再訪する / 端末の設定が変わる
test('選んだテーマは再訪時の最初の描画から当たり、端末に合わせる設定では端末の変化に追従する', async ({
	browser
}) => {
	const context = await browser.newContext({ colorScheme: 'light', locale: 'ja-JP' });
	const page = await context.newPage();
	await page.goto('/login');
	await page.getByRole('button', { name: '表示の設定' }).click();
	await page.getByLabel('ダーク').check();
	expect(await bg(page)).toBe('rgb(9, 13, 12)');

	// 再訪：スクリプトが走った直後（最初の描画の前）にもうダークになっている
	const themeAtFirstScript = await (async () => {
		const values: string[] = [];
		await page.exposeFunction('__record', (value: string) => values.push(value));
		await page.addInitScript(() => {
			document.addEventListener('DOMContentLoaded', () =>
				(window as unknown as { __record: (v: string) => void }).__record(
					document.documentElement.getAttribute('data-theme') ?? 'none'
				)
			);
		});
		await page.reload();
		await expect.poll(() => values.length).toBeGreaterThan(0);
		return values[0];
	})();
	expect(themeAtFirstScript).toBe('dark');

	// 端末に合わせる設定に戻し、端末をダークに切り替えると再読み込みせずに変わる
	await page.getByRole('button', { name: '表示の設定' }).click();
	await page.getByLabel('端末の設定に合わせる').check();
	expect(await bg(page)).toBe('rgb(247, 249, 249)');
	await page.emulateMedia({ colorScheme: 'dark' });
	expect(await bg(page)).toBe('rgb(9, 13, 12)');
});

// LOOK-03 favicon とアプリアイコン
test('Nagi Space のアイコンとマニフェストを配る', async ({ page }) => {
	await page.goto('/login');
	await expect(page.locator('link[rel="icon"][type="image/svg+xml"]')).toHaveAttribute(
		'href',
		/\/icons\/icon\.svg$/
	);
	for (const path of ['/favicon.png', '/icons/icon.svg', '/icons/apple-touch-icon.png']) {
		expect((await page.request.get(path)).status()).toBe(200);
	}
	const manifest = await (await page.request.get('/manifest.webmanifest')).json();
	expect(manifest.name).toBe('Nagi Space');
	expect(manifest.icons.some((icon: { purpose?: string }) => icon.purpose === 'maskable')).toBe(
		true
	);
});

// LOOK-06 英語のブラウザで開く / 言語を切り替える
test('英語のブラウザでは英語で表示し、切り替えた言語はこの端末に保存される', async ({
	browser
}) => {
	const context = await browser.newContext({ locale: 'en-US' });
	const page = await context.newPage();
	await page.goto('/login');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('Log in');
	await expect(page.locator('html')).toHaveAttribute('lang', 'en');
	await page.getByRole('button', { name: 'Display settings' }).click();
	await page.getByLabel('Language').selectOption('ja');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('ログイン');
	await page.goto('/login');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('ログイン');
	await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
});

// LOOK-05 スマートフォンで入室する
test('幅360pxでも、botたんがいるSpaceを横スクロールせずに使える', async ({ browser }) => {
	test.setTimeout(90_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	await host.page.setViewportSize({ width: 360, height: 780 });
	await createSpace(host.page, 'スマホで見るとても長いタイトルのSpaceでも横にはみ出さないか');
	await host.page.getByRole('button', { name: 'botたんを呼ぶ' }).click({ timeout: 15000 });
	await expect(host.page.getByTestId('bot-avatar')).toBeVisible({ timeout: 30000 });
	await host.page.getByRole('button', { name: 'リアクション' }).click();
	await expect(host.page.getByTestId('emoji-picker')).toBeVisible();
	const overflow = await host.page.evaluate(
		() => document.documentElement.scrollWidth - document.documentElement.clientWidth
	);
	expect(overflow).toBeLessThanOrEqual(0);
	for (const id of ['captions', 'bot-avatar', 'emoji-picker']) {
		await expect(host.page.getByTestId(id)).toBeVisible();
	}
	await cleanup(host.did);
});
