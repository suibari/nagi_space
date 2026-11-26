import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs, setBotCapacity } from './fixtures/space.ts';
import { db } from './fixtures/session.ts';

// LIFE-03 一覧を開く
test('開催中のパブリックSpaceを人数とともに一覧に出し、botたんSpaceは出さない', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'いちらんテスト');
	const id = path.split('/').pop()!;
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', {
		timeout: 15000
	});

	const botHost = await openAs(browser);
	await setBotCapacity(1);
	const botPath = await createSpace(botHost.page, 'ないしょのbotたん', 'bot');

	const viewer = await openAs(browser);
	await viewer.page.goto('/');
	const item = viewer.page.locator(`[data-space-id="${id}"]`);
	await expect(item).toContainText('いちらんテスト');
	// ホストの入室は Webhook で反映される
	await expect(async () => {
		await viewer.page.reload();
		await expect(item).toContainText('スピーカー 1人', { timeout: 1000 });
	}).toPass({ timeout: 15000 });
	await expect(item).toContainText('聴いている人 0人');
	await expect(viewer.page.locator(`[data-space-id="${botPath.split('/').pop()}"]`)).toHaveCount(0);

	// 聴衆が入ると聴いている人が増える
	await viewer.page.goto(path);
	await expect(viewer.page.getByTestId('connection-state')).toHaveText('接続しました', {
		timeout: 15000
	});
	const third = await openAs(browser);
	await expect(async () => {
		await third.page.goto('/');
		await expect(third.page.locator(`[data-space-id="${id}"]`)).toContainText('聴いている人 1人', {
			timeout: 1000
		});
	}).toPass({ timeout: 15000 });

	await setBotCapacity(undefined);
	await cleanup(host.did, botHost.did, viewer.did, third.did);
});

// LIFE-03 一覧を見ている間にSpaceが終わる
test('終わったSpaceは一覧から消え、開いても終了の表示になる', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'すぐおわる');
	const id = path.split('/').pop()!;
	const viewer = await openAs(browser);
	await viewer.page.goto('/');
	await expect(viewer.page.locator(`[data-space-id="${id}"]`)).toBeVisible();

	// ホストが終了したのと同じ状態にする（終了の操作は作業4.3）
	const space = JSON.parse((await db.get(`space:${id}`))!);
	await db.set(`space:${id}`, JSON.stringify({ ...space, endedAt: new Date().toISOString() }));
	await db.del(`space:live:${id}`, `space:host:${host.did}`);
	await viewer.page.reload();
	await expect(viewer.page.locator(`[data-space-id="${id}"]`)).toHaveCount(0);
	await viewer.page.goto(path);
	await expect(viewer.page.getByTestId('ended')).toBeVisible();
	await db.del(`space:${id}`);
	await cleanup(host.did, viewer.did);
});
