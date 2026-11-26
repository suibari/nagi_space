import { expect, test, type Page } from '@playwright/test';
import { db } from './fixtures/session.ts';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 15000 };

async function join(page: Page, path: string) {
	await page.goto(path);
	await expect(page.getByTestId('connection-state')).toHaveText('接続しました', connected);
}

/** 聴衆をスピーカーにする（リクエスト→承認→マイクの許可）。 */
async function makeSpeaker(host: Page, speaker: Page, did: string) {
	await speaker
		.context()
		.grantPermissions(['microphone'], { origin: new URL(speaker.url()).origin });
	await speaker.getByRole('button', { name: '発話をリクエスト' }).click();
	await host
		.getByTestId('requests')
		.locator(`li[data-did="${did}"]`)
		.getByRole('button', { name: '承認する' })
		.click(connected);
	await speaker.getByRole('button', { name: 'マイクを許可してスピーカーになる' }).click(connected);
	await expect(speaker.getByRole('button', { name: 'マイクをオンにする' })).toBeVisible(connected);
}

// PART-06 ホストのミュート（本人は解除できる）
test('ホストがスピーカーをミュートでき、スピーカーは自分で解除できる', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ミュートのテスト');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const speaker = await openAs(browser);
	await join(speaker.page, path);
	await makeSpeaker(host.page, speaker.page, speaker.did);
	await speaker.page.getByRole('button', { name: 'マイクをオンにする' }).click();
	await expect(speaker.page.getByRole('button', { name: 'ミュートする' })).toBeVisible(connected);

	const row = host.page.getByTestId('host-participants').locator(`li[data-did="${speaker.did}"]`);
	await row.getByRole('button', { name: 'ミュートする' }).click(connected);
	await expect(speaker.page.getByRole('button', { name: 'マイクをオンにする' })).toBeVisible(
		connected
	);
	await speaker.page.getByRole('button', { name: 'マイクをオンにする' }).click();
	await expect(speaker.page.getByRole('button', { name: 'ミュートする' })).toBeVisible(connected);
	await cleanup(host.did, speaker.did);
});

// PART-06 ホストが退室させる / 退室させられた人が別のSpaceに入る
test('退室させられた人は接続が切れ、同じSpaceには入り直せないが、別のSpaceには入れる', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'たいしつ');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const target = await openAs(browser);
	await join(target.page, path);

	const row = host.page.getByTestId('host-participants').locator(`li[data-did="${target.did}"]`);
	await row.getByRole('button', { name: '退室させる' }).click(connected);
	await expect(row.getByTestId('kick-confirm')).toContainText('再入室も禁止します');
	await row.getByTestId('kick-confirm').getByRole('button', { name: '退室させる' }).click();

	await expect(target.page.getByTestId('removed')).toBeVisible(connected);
	await target.page.reload();
	await expect(target.page.getByTestId('banned')).toHaveText('この Space には入れません。');
	await expect(host.page.locator('[data-testid="participants"] li')).toHaveCount(1, connected);

	// 別の Space には入れる
	const otherHost = await openAs(browser);
	const otherPath = await createSpace(otherHost.page, 'べつのスペース');
	await join(target.page, otherPath);

	// Space が終わると再入室の禁止も消える（LIFE-07）
	const id = path.split('/').pop()!;
	await host.page.getByRole('button', { name: 'Space を終了する' }).click();
	await expect(host.page.getByTestId('ended')).toBeVisible(connected);
	expect(await db.list(`space:ban:${id}:`)).toEqual([]);
	await db.del(`space:${id}`);
	await cleanup(host.did, target.did, otherHost.did);
});
