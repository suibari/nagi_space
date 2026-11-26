import { expect, test } from '@playwright/test';

test.use({ locale: 'ja-JP' });

test('ログイン画面を表示できる', async ({ page }) => {
	await page.goto('/login');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText('ログイン');
	await expect(page.getByLabel('ハンドル')).toBeVisible();
});

test('存在しないハンドルではエラーを表示する', async ({ page }) => {
	await page.goto('/login');
	await page.getByLabel('ハンドル').fill('no-such-handle.invalid');
	await page.getByRole('button', { name: 'ログイン' }).click();
	// ハンドルの名前解決はネットワークに依存するので長めに待つ
	await expect(page.getByRole('alert')).toContainText('ログインを始められませんでした', {
		timeout: 20000
	});
});

test('callback の失敗はログイン画面に戻してエラーを表示する', async ({ page }) => {
	await page.goto('/oauth/callback?state=bogus&code=x&iss=https://bsky.social');
	await expect(page).toHaveURL(/\/login\?error=callback/);
	await expect(page.getByRole('alert')).toContainText('ログインを完了できませんでした');
});
