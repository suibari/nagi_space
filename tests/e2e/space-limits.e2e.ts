import { expect, test } from '@playwright/test';
import { db } from './fixtures/session.ts';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 15000 };

// LIFE-06 ホストが切断して戻る / ホストが戻らない（E2E では待ち時間を8秒にしている）
test('ホストが切断すると待ちの表示になり、戻れば続き、戻らなければ終わる', async ({ browser }) => {
	test.setTimeout(120_000);
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ホストまち');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await listener.page.goto(path);
	await expect(listener.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await expect(listener.page.getByTestId('host-away')).toHaveCount(0);

	// 切断して待ち時間内に戻る
	await host.page.close();
	await expect(listener.page.getByTestId('host-away')).toBeVisible(connected);
	const back = await host.context.newPage();
	await back.goto(path);
	await expect(back.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await expect(listener.page.getByTestId('host-away')).toHaveCount(0, connected);
	await expect(listener.page.getByTestId('connection-state')).toHaveText('接続しました');

	// 切断して戻らない。画面の状態確認（20秒ごと）で終わる
	await back.close();
	await expect(listener.page.getByTestId('host-away')).toBeVisible(connected);
	await expect(listener.page.getByTestId('ended')).toBeVisible({ timeout: 60_000 });
	await cleanup(host.did, listener.did);
});

// LIFE-08 入室者の上限に達している（E2E では上限を2人にしている）
test('入室者が上限に達していると満員と表示して入れない', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'まんいん');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const first = await openAs(browser);
	await first.page.goto(path);
	await expect(first.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const id = path.split('/').pop()!;
	await expect(async () => {
		expect(await db.list(`space:presence:${id}:`)).toHaveLength(2);
	}).toPass(connected);

	const second = await openAs(browser);
	await second.page.goto(path);
	await expect(second.page.getByTestId('full')).toHaveText('この Space は満員です。');
	// すでに入っている人の再接続は通す
	await first.page.reload();
	await expect(first.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await cleanup(host.did, first.did, second.did);
});

// LIFE-09 4時間たつ
test('開催時間の上限を過ぎたら終わり、時間の上限で終わったと表示する', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ながい');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const id = path.split('/').pop()!;
	const space = JSON.parse((await db.get(`space:${id}`))!);
	const fourHoursAgo = new Date(Date.now() - 4 * 3600_000 - 1000).toISOString();
	await db.set(`space:${id}`, JSON.stringify({ ...space, startedAt: fourHoursAgo }));

	const viewer = await openAs(browser);
	await viewer.page.goto('/');
	await expect(viewer.page.locator(`[data-space-id="${id}"]`)).toHaveCount(0);
	await viewer.page.goto(path);
	await expect(viewer.page.getByTestId('ended')).toHaveText(
		'開催時間の上限に達したため、この Space は終了しました。'
	);
	// 入室中だったホストの画面も終了になる
	await expect(host.page.getByTestId('ended')).toBeVisible(connected);
	await db.del(`space:${id}`);
	await cleanup(host.did, viewer.did);
});
