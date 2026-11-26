import { expect, test } from '@playwright/test';

test('トップ画面を表示できる', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle('Nagi Space');
});
