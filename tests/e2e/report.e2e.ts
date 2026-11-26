import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 15000 };

// PART-07 参加者を通報する（E2E の偽のログインでは AppView に届かないので、失敗の表示までを確かめる。
// 送る内容は src/lib/server/report.test.ts で確かめている）
test('参加者を通報するフォームを開け、送れなかったときはそう表示する。ホストには何も出ない', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'つうほう');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await listener.page.goto(path);
	await expect(listener.page.getByTestId('connection-state')).toHaveText('接続しました', connected);

	// ホストには自分の Space を通報する操作を出さない
	await expect(host.page.getByRole('button', { name: 'この Space を通報' })).toHaveCount(0);

	const hostRow = listener.page.locator('[data-testid="participants"] li[data-role="host"]');
	await hostRow.getByRole('button', { name: '通報' }).click();
	const form = listener.page.getByTestId('report-form');
	await expect(form).toContainText('相手には知らされません');
	await expect(form).toContainText('音声や字幕は送られません');
	await form.getByLabel('理由').selectOption('spam');
	await form.getByLabel('くわしい内容（任意）').fill('宣伝ばかり');
	await form.getByRole('button', { name: '送信する' }).click();
	await expect(form.getByRole('alert')).toHaveText(
		'通報を送れませんでした。もう一度お試しください。'
	);
	await expect(host.page.getByTestId('report-form')).toHaveCount(0);
	await cleanup(host.did, listener.did);
});

test('自分自身は通報できない', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'じぶん');
	const listener = await openAs(browser);
	await listener.page.goto(path);
	const response = await listener.page.request.post(`${path}/report`, {
		headers: { origin: new URL(listener.page.url()).origin },
		data: { reason: 'spam', member: listener.did }
	});
	expect(response.status()).toBe(400);
	await cleanup(host.did, listener.did);
});
