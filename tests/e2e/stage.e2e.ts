import { expect, test, type Page } from '@playwright/test';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 15000 };

async function join(page: Page, path: string) {
	await page.goto(path);
	await expect(page.getByTestId('connection-state')).toHaveText('接続しました', connected);
}

async function allowMic(page: Page) {
	await page.context().grantPermissions(['microphone'], { origin: new URL(page.url()).origin });
}

// PART-03 リクエストが承認される / TRANS-02
test('聴衆がリクエストしてホストが承認すると、字幕の案内とマイクの許可を経てミュートのスピーカーになる', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'はっわのテスト');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await join(listener.page, path);

	await listener.page.getByRole('button', { name: '発話をリクエスト' }).click();
	await expect(listener.page.getByText('ホストの承認を待っています。')).toBeVisible();
	// 取り消してもう一度リクエストする
	await listener.page.getByRole('button', { name: 'リクエストを取り消す' }).click();
	await listener.page.getByRole('button', { name: '発話をリクエスト' }).click();

	const request = host.page.getByTestId('requests').locator(`li[data-did="${listener.did}"]`);
	await expect(request).toBeVisible(connected);
	await request.getByRole('button', { name: '承認する' }).click();

	const step = listener.page.getByTestId('mic-step');
	await expect(step).toContainText('字幕として入室者全員に表示されます', connected);
	await allowMic(listener.page);
	await step.getByRole('button', { name: 'マイクを許可してスピーカーになる' }).click();

	await expect(listener.page.getByRole('button', { name: 'マイクをオンにする' })).toBeVisible(
		connected
	);
	await expect(listener.page.getByRole('button', { name: '聴衆に戻る' })).toBeVisible();
	await expect(
		host.page.locator(`[data-testid="participants"] li[data-role="speaker"]`)
	).toHaveCount(1, connected);

	// PART-04 マイクのオン・オフ、話している人の表示、自分で聴衆に戻る
	await listener.page.getByRole('button', { name: 'マイクをオンにする' }).click();
	await expect(listener.page.getByRole('button', { name: 'ミュートする' })).toBeVisible(connected);
	// 偽のマイクは1秒ごとに短く鳴るだけなので、「話しています」は一瞬だけ出る。毎フレーム見張る
	await host.page.waitForFunction(
		() =>
			document
				.querySelector('[data-testid="participants"] li[data-role="speaker"]')
				?.textContent?.includes('話しています'),
		undefined,
		{ polling: 'raf', timeout: 20000 }
	);
	await listener.page.getByRole('button', { name: '聴衆に戻る' }).click();
	await expect(listener.page.getByRole('button', { name: '発話をリクエスト' })).toBeVisible(
		connected
	);
	await expect(listener.page.getByRole('button', { name: 'マイクをオンにする' })).toHaveCount(0);
	await expect(listener.page.getByRole('button', { name: 'ミュートする' })).toHaveCount(0);
	await cleanup(host.did, listener.did);
});

// PART-03 マイクの許可を拒否する
test('承認されてもマイクを拒否したら聴衆のまま、許可が必要と表示する', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'マイクきょひ');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await join(listener.page, path);
	// マイクの取得を拒否させる
	await listener.page.evaluate(() => {
		navigator.mediaDevices.getUserMedia = () =>
			Promise.reject(new DOMException('denied', 'NotAllowedError'));
	});
	await listener.page.getByRole('button', { name: '発話をリクエスト' }).click();
	const request = host.page.getByTestId('requests').locator(`li[data-did="${listener.did}"]`);
	await request.getByRole('button', { name: '承認する' }).click({ timeout: 15000 });
	await listener.page
		.getByRole('button', { name: 'マイクを許可してスピーカーになる' })
		.click(connected);
	await expect(listener.page.getByRole('alert')).toHaveText(
		'スピーカーになるには、マイクの許可が必要です。'
	);
	await expect(listener.page.getByRole('button', { name: 'マイクをオンにする' })).toHaveCount(0);
	await expect(
		host.page.locator(`[data-testid="participants"] li[data-role="speaker"]`)
	).toHaveCount(0);
	await cleanup(host.did, listener.did);
});

// PART-03 ホストが招待する / PART-06 発話権の取り消し / LIFE-08 スピーカーの上限（E2E では2人）
test('ホストの招待を受け入れるとスピーカーになり、上限に達すると承認できず、ホストは聴衆に戻せる', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'しょうたい');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const invited = await openAs(browser);
	await join(invited.page, path);
	const other = await openAs(browser);
	await join(other.page, path);

	const row = host.page.getByTestId('host-participants').locator(`li[data-did="${invited.did}"]`);
	await row.getByRole('button', { name: '招待する' }).click(connected);
	await expect(invited.page.getByTestId('invited')).toContainText(
		'スピーカーに招待されました',
		connected
	);
	await invited.page.getByRole('button', { name: '受け入れる' }).click();
	await allowMic(invited.page);
	await invited.page.getByRole('button', { name: 'マイクを許可してスピーカーになる' }).click();
	await expect(invited.page.getByRole('button', { name: '聴衆に戻る' })).toBeVisible(connected);

	// ホストと合わせてスピーカーが2人（上限）なので、次のリクエストは承認できない
	await other.page.getByRole('button', { name: '発話をリクエスト' }).click();
	const request = host.page.getByTestId('requests').locator(`li[data-did="${other.did}"]`);
	await request.getByRole('button', { name: '承認する' }).click(connected);
	await expect(host.page.getByTestId('stage-error')).toHaveText('スピーカーが上限に達しています。');

	// ホストが発話権を取り消す
	await row.getByRole('button', { name: '聴衆に戻す' }).click(connected);
	await expect(invited.page.getByRole('button', { name: '発話をリクエスト' })).toBeVisible(
		connected
	);
	await cleanup(host.did, invited.did, other.did);
});

test('聴衆はホストの操作（承認・招待・取り消し）を使えない', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'けんげん');
	const listener = await openAs(browser);
	await join(listener.page, path);
	const response = await listener.page.request.post(`${path}/stage`, {
		headers: { origin: new URL(listener.page.url()).origin },
		data: { action: 'invite', target: listener.did }
	});
	expect(response.status()).toBe(403);
	await cleanup(host.did, listener.did);
});
