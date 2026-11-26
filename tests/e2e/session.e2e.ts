import { expect, test } from '@playwright/test';
import { db, revokeOAuthSession, signIn } from './fixtures/session.ts';

test.use({ locale: 'ja-JP' });

// ACC-04 再訪する
test('ログイン済みの利用者は再訪してもログイン状態のまま', async ({ context, page }) => {
	const did = `did:plc:e2e${crypto.randomUUID().slice(0, 8)}`;
	await signIn(context, did);
	await page.goto('/');
	await expect(page.getByTestId('signed-in')).toBeVisible();

	// 新しいタブで開き直しても（cookie が残っていれば）ログインを求めない
	const again = await context.newPage();
	await again.goto('/');
	await expect(again.getByTestId('signed-in')).toBeVisible();
	await expect(again.getByRole('link', { name: 'ログイン' })).toHaveCount(0);
	await revokeOAuthSession(did);
});

test('ログイン済みでログイン画面を開くと戻り先へ移る', async ({ context, page }) => {
	const did = `did:plc:e2e${crypto.randomUUID().slice(0, 8)}`;
	await signIn(context, did);
	await page.goto('/login?returnTo=%2F');
	await expect(page).toHaveURL(/\/$/);
	await revokeOAuthSession(did);
});

test('PDS側で認可が無くなったセッションはログアウト扱いにする', async ({ context, page }) => {
	const did = `did:plc:e2e${crypto.randomUUID().slice(0, 8)}`;
	const sessionId = await signIn(context, did);
	await revokeOAuthSession(did);
	await page.goto('/');
	await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
	expect(await db.get(`app:session:${sessionId}`)).toBeUndefined();
	expect((await context.cookies()).some((cookie) => cookie.name === 'ns_sid')).toBe(false);
});

test('ログアウトするとセッションが消える', async ({ context, page }) => {
	const did = `did:plc:e2e${crypto.randomUUID().slice(0, 8)}`;
	const sessionId = await signIn(context, did);
	await page.goto('/');
	await page.getByRole('button', { name: 'ログアウト' }).click();
	await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
	expect(await db.get(`app:session:${sessionId}`)).toBeUndefined();
	await revokeOAuthSession(did);
});
