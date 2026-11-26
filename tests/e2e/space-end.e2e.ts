import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';
import { withRedis } from './fixtures/session.ts';

const connected = { timeout: 15000 };

// LIFE-05 ホストが終了する / LIFE-07 終了後に何も残さない
test('ホストが終了すると全員の接続が切れ、終了の表示になり、開催情報だけが残る', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'おわりのテスト');
	const id = path.split('/').pop()!;
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);

	const listener = await openAs(browser);
	await listener.page.goto(path);
	await expect(listener.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	// 聴衆には終了の操作を出さない
	await expect(listener.page.getByRole('button', { name: 'Space を終了する' })).toHaveCount(0);
	const forbidden = await listener.page.request.post(`${path}/end`, {
		headers: { origin: new URL(listener.page.url()).origin }
	});
	expect(forbidden.status()).toBe(403);

	await host.page.getByRole('button', { name: 'Space を終了する' }).click();
	await expect(host.page.getByTestId('ended')).toBeVisible(connected);
	await expect(listener.page.getByTestId('ended')).toBeVisible(connected);

	// 一覧から消え、URL は終了の表示だけになる
	const viewer = await openAs(browser);
	await viewer.page.goto('/');
	await expect(viewer.page.locator(`[data-space-id="${id}"]`)).toHaveCount(0);
	await viewer.page.goto(path);
	await expect(viewer.page.getByTestId('ended')).toBeVisible();
	await expect(viewer.page.getByTestId('participants')).toHaveCount(0);

	await withRedis(async (redis) => {
		const saved = JSON.parse((await redis.get(`space:${id}`))!);
		expect(Object.keys(saved).sort()).toEqual(
			['endedAt', 'host', 'hostDid', 'id', 'kind', 'startedAt', 'title'].sort()
		);
		expect(await redis.exists(`space:presence:${id}`)).toBe(0);
		expect(await redis.exists(`space:host:${host.did}`)).toBe(0);
		await redis.del(`space:${id}`);
	});
	await cleanup(host.did, listener.did, viewer.did);
});
