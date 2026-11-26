import { expect, type Browser } from '@playwright/test';
import { db, revokeOAuthSession, signIn } from './session.ts';
import { FAKE_CONVO_URL } from '../../../playwright.config.ts';

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
	for (const did of dids) {
		const id = await db.get(`space:host:${did}`);
		if (id) {
			const presence = await db.list(`space:presence:${id}:`);
			await db.del(
				`space:${id}`,
				`space:host:${did}`,
				`space:live:${id}`,
				...presence.map((row) => row.key)
			);
		}
		await revokeOAuthSession(did);
	}
}

/**
 * botたんの空きを変える。E2E では本物の space-agent が偽の convo の空きを1秒ごとに Nagi Space へ
 * 知らせるので、偽の convo の空きを変えて、知らせが届くまで待つ。
 */
export async function setBotCapacity(freeSessions: number) {
	await fetch(`${FAKE_CONVO_URL}/test/capacity`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ bot: freeSessions })
	});
	const free = () =>
		db
			.get('bot:capacity')
			.then((raw) => JSON.parse(raw ?? '{"freeSessions":-1}').freeSessions as number);
	await expect.poll(free, { timeout: 10000 }).toBe(freeSessions);
}

/** テストの終わりに、botたんの空きを既定（2）に戻す（待たない）。 */
export async function resetBotCapacity() {
	await fetch(`${FAKE_CONVO_URL}/test/capacity`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ bot: 2 })
	});
}
