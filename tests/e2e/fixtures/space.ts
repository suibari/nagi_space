import { expect, type Browser } from '@playwright/test';
import { revokeOAuthSession, signIn, withRedis } from './session.ts';

export const memberDid = (tag = 'member') =>
	`did:plc:${tag}${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

/** ログイン済みの利用者のページを開く。 */
export async function openAs(browser: Browser, did = memberDid()) {
	const context = await browser.newContext({ locale: 'ja-JP' });
	await signIn(context, did);
	const page = await context.newPage();
	return { did, context, page };
}

/** 画面からSpaceを作成し、そのパスを返す。 */
export async function createSpace(
	page: import('@playwright/test').Page,
	title: string,
	kind: 'public' | 'bot' = 'public'
) {
	await page.goto('/spaces/new');
	await page.getByLabel('タイトル').fill(title);
	if (kind === 'bot') await page.getByLabel('botたんSpace').check();
	await page.getByRole('button', { name: '開始する' }).click();
	// room の作成を待つ。失敗したら画面のエラー表示を添えて落とす
	const alert = page.getByRole('alert');
	await expect(async () => {
		if (await alert.isVisible()) throw new Error(`作成に失敗: ${await alert.textContent()}`);
		expect(page.url()).toMatch(/\/s\/[a-z2-9]{12}$/);
	}).toPass({ timeout: 15000 });
	return new URL(page.url()).pathname;
}

/** テストで作った Space と利用者の後片付け。 */
export async function cleanup(...dids: string[]) {
	await withRedis(async (redis) => {
		for (const did of dids) {
			const id = await redis.get(`space:host:${did}`);
			if (id) {
				await redis.del([`space:${id}`, `space:host:${did}`, `space:presence:${id}`]);
				await redis.zRem('space:live:public', id);
			}
		}
	});
	for (const did of dids) await revokeOAuthSession(did);
}
