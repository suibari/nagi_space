import { expect, test } from '@playwright/test';
import { revokeOAuthSession, signIn, withRedis } from './fixtures/session.ts';

test.use({ locale: 'ja-JP' });

const didWith = (tag: string) =>
	`did:plc:${tag}${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

// ACC-02 Nagi未登録のアカウントでログインする
test('Nagi未登録ならNagiで登録する案内を表示する', async ({ context, page }) => {
	const did = didWith('unreg');
	await signIn(context, did);
	await page.goto('/');
	await expect(page.getByTestId('unregistered')).toBeVisible();
	await expect(page.getByTestId('signed-in')).toHaveCount(0);
	await revokeOAuthSession(did);
});

test('Nagi登録済みならログイン中として表示する', async ({ context, page }) => {
	const did = didWith('member');
	await signIn(context, did);
	await page.goto('/');
	await expect(page.getByTestId('signed-in')).toBeVisible();
	const cached = await withRedis((redis) => redis.get(`nagi:registration:${did}`));
	expect(JSON.parse(cached ?? '{}').registration).toBe('registered');
	await revokeOAuthSession(did);
});

// ACC-02 AppViewに問い合わせられない
test('AppViewに確認できなければ未登録扱いにせず再読み込みを案内する', async ({ context, page }) => {
	const did = didWith('down');
	await signIn(context, did);
	await page.goto('/');
	await expect(page.getByTestId('registration-unknown')).toBeVisible();
	await expect(page.getByTestId('unregistered')).toHaveCount(0);
	// 確認できなかった結果は覚えない
	expect(await withRedis((redis) => redis.exists(`nagi:registration:${did}`))).toBe(0);
	await revokeOAuthSession(did);
});
