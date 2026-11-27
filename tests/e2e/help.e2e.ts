import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 15000 };

// HELP-01 Space画面でヘルプを開く / Escキーで閉じる
test('Space画面でヘルプを開いても接続は続き、Esc で閉じるとフォーカスが「?」に戻る', async ({
	browser
}) => {
	const host = await openAs(browser);
	await createSpace(host.page, 'ヘルプ');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const button = host.page.getByRole('button', { name: 'ヘルプ' });
	await button.click();
	const dialog = host.page.getByRole('dialog', { name: 'Nagi Space の使い方' });
	await expect(dialog).toBeVisible();
	for (const title of [
		'聴く',
		'話す',
		'リアクション',
		'botたん',
		'字幕とコメント',
		'通報',
		'何も残さない'
	]) {
		await expect(dialog.getByRole('heading', { name: title, exact: true })).toBeVisible();
	}
	await host.page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(button).toBeFocused();
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました');
	await cleanup(host.did);
});

// HELP-01 ログインしていない / 英語
test('未ログインのトップでも開け、英語では英語で表示される', async ({ browser }) => {
	const ja = await browser.newContext({ locale: 'ja-JP' });
	const page = await ja.newPage();
	await page.goto('/');
	await page.getByRole('button', { name: 'ヘルプ' }).click();
	const dialog = page.getByRole('dialog', { name: 'Nagi Space の使い方' });
	await expect(dialog).toBeVisible();
	await dialog.getByRole('button', { name: '閉じる' }).click();
	await expect(dialog).toBeHidden();
	await ja.close();

	const en = await browser.newContext({ locale: 'en-US' });
	const enPage = await en.newPage();
	await enPage.goto('/');
	await enPage.getByRole('button', { name: 'Help' }).click();
	await expect(enPage.getByRole('dialog', { name: 'How to use Nagi Space' })).toBeVisible();
	await en.close();
});
