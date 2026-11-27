import { writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { db } from './fixtures/session.ts';
import { cleanup, createSpace, openAs, setBotCapacity } from './fixtures/space.ts';

const connected = { timeout: 15000 };
const slow = { timeout: 30000 };

async function join(page: Page, path: string) {
	await page.goto(path);
	await expect(page.getByTestId('connection-state')).toHaveText('接続しました', connected);
}

/**
 * 作業11.1 の通し試験：ホスト・スピーカー・聴衆の3人と botたんで、作成から終了まで。
 * 試験中の LiveKit の参加者数を数え、接続時間の見積もり（作業11.2）に使う。
 */
test('ホスト・スピーカー・聴衆とbotたんで、作成から終了まで通して使える', async ({ browser }) => {
	test.setTimeout(240_000);
	const startedAt = Date.now();
	const samples: number[] = [];
	await setBotCapacity(2);

	// 作成（LIFE-01）と一覧（LIFE-03）
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'みんなでおしゃべり');
	const id = path.split('/').pop()!;
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const speaker = await openAs(browser);
	await speaker.page.goto('/');
	await expect(speaker.page.locator(`[data-space-id="${id}"]`)).toBeVisible();
	await join(speaker.page, path);
	const listener = await openAs(browser);
	await join(listener.page, path);
	const count = async () => samples.push((await db.list(`space:presence:${id}:`)).length);

	// 発話のリクエストと承認（PART-03）
	await speaker.context.grantPermissions(['microphone'], {
		origin: new URL(speaker.page.url()).origin
	});
	await speaker.page.getByRole('button', { name: '発話をリクエスト' }).click();
	await host.page
		.getByTestId('requests')
		.locator(`li[data-did="${speaker.did}"]`)
		.getByRole('button', { name: '承認する' })
		.click(connected);
	await speaker.page
		.getByRole('button', { name: 'マイクを許可してスピーカーになる' })
		.click(connected);
	await speaker.page.getByRole('button', { name: 'マイクをオンにする' }).click(connected);
	await count();

	// 字幕（TRANS-01）
	await expect(
		listener.page.locator(`[data-testid="caption-line"][data-speaker="${speaker.did}"]`).first()
	).toContainText('テストの発話です', slow);

	// botたん（BOT-01・BOT-03・BOT-05）
	await host.page.getByRole('button', { name: 'botたんを呼ぶ' }).click(connected);
	await expect(
		listener.page.locator('[data-testid="participants"] li[data-role="bot"]')
	).toBeVisible(slow);
	await expect(
		listener.page.locator('[data-testid="caption-line"][data-speaker="bot:bot-tan"]').first()
	).toContainText('うんうん', slow);
	await expect(listener.page.getByTestId('bot-avatar')).toHaveAttribute(
		'data-motion',
		'happy',
		slow
	);
	await count();

	// 聴衆の絵文字（REACT-01）
	await listener.page.getByRole('button', { name: 'リアクション' }).click();
	await listener.page.getByTestId('emoji-picker').locator('[data-emoji="u:🎉"]').click();
	await expect(
		host.page.locator(`[data-testid="reaction"][data-from="${listener.did}"]`)
	).toContainText('🎉', connected);

	// ホストのミュート（PART-06）とスピーカーの解除
	await host.page
		.getByTestId('host-participants')
		.locator(`li[data-did="${speaker.did}"]`)
		.getByRole('button', { name: 'ミュートする' })
		.click(connected);
	await expect(speaker.page.getByRole('button', { name: 'マイクをオンにする' })).toBeVisible(
		connected
	);
	await count();

	// 終了（LIFE-05・LIFE-07）
	await host.page.getByRole('button', { name: 'Space を終了する' }).click();
	for (const page of [host.page, speaker.page, listener.page]) {
		await expect(page.getByTestId('ended')).toBeVisible(connected);
	}
	expect(await db.list(`space:presence:${id}:`)).toEqual([]);
	expect(await db.list(`space:role:${id}:`)).toEqual([]);

	const seconds = (Date.now() - startedAt) / 1000;
	if (process.env.E2E_REPORT) {
		await writeFile(
			process.env.E2E_REPORT,
			JSON.stringify({ seconds, presenceSamples: samples }, null, 2)
		);
	}
	await db.del(`space:${id}`);
	await cleanup(host.did, speaker.did, listener.did);
});
