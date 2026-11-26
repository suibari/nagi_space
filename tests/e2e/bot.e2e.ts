import { expect, test, type Page } from '@playwright/test';
import { FAKE_CONVO_URL } from '../../playwright.config.ts';
import {
	cleanup,
	createSpace,
	openAs,
	resetBotCapacity,
	setBotCapacity
} from './fixtures/space.ts';

const connected = { timeout: 15000 };
const slow = { timeout: 25000 };

async function join(page: Page, path: string) {
	await page.goto(path);
	await expect(page.getByTestId('connection-state')).toHaveText('接続しました', connected);
}

async function speak(page: Page) {
	await page.context().grantPermissions(['microphone'], { origin: new URL(page.url()).origin });
	await page.getByRole('button', { name: 'マイクをオンにする' }).click();
	await expect(page.getByRole('button', { name: 'ミュートする' })).toBeVisible(connected);
}

// TRANS-01 スピーカーが話す / TRANS-02 / TRANS-04 あとから入室する
test('ホストの発話が字幕になり、入室者全員に話者の名前と一緒に表示される', async ({ browser }) => {
	test.setTimeout(90_000);
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'じまく');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await join(listener.page, path);
	await expect(listener.page.getByTestId('captions')).toContainText(
		'字幕として入室者全員に表示されます'
	);

	await speak(host.page);
	const line = listener.page
		.locator(`[data-testid="caption-line"][data-speaker="${host.did}"]`)
		.first();
	await expect(line).toContainText('テストの発話です', slow);
	await expect(line).toContainText(/テスト[0-9a-f]{4}/);
	await expect(
		host.page.locator(`[data-testid="caption-line"][data-speaker="${host.did}"]`).first()
	).toBeVisible();
	// TRANS-05 スピーカーが字幕を止める操作は無い
	await expect(host.page.getByRole('button', { name: /字幕を(止|オフ|切)/ })).toHaveCount(0);
	await expect(host.page.getByRole('checkbox', { name: /字幕/ })).toHaveCount(0);
	await cleanup(host.did, listener.did);
});

// BOT-01 ホストがbotたんを招待する・除外する / BOT-03 / TRANS-01 botたんが返事する
test('ホストが呼ぶとbotたんが加わり、話した人の名前付きの発話に返事して字幕になる。除外すると抜ける', async ({
	browser
}) => {
	test.setTimeout(120_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'botたんよぶ');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await join(listener.page, path);
	// 聴衆には botたんを呼ぶ操作を出さない
	await expect(listener.page.getByTestId('bot-controls')).toHaveCount(0);

	await host.page.getByRole('button', { name: 'botたんを呼ぶ' }).click(connected);
	const botRow = listener.page.locator('[data-testid="participants"] li[data-role="bot"]');
	await expect(botRow).toContainText('botたん', slow);

	await speak(host.page);
	await expect(
		listener.page.locator('[data-testid="caption-line"][data-speaker="bot:bot-tan"]').first()
	).toContainText('うんうん、すてきだね！', slow);
	// botたんには「表示名: 発話」の形で届いている
	const sent = (await (await fetch(`${FAKE_CONVO_URL}/test/texts`)).json()) as { texts: string[] };
	expect(sent.texts.some((text) => /^テスト[0-9a-f]{4}: テストの発話です$/.test(text))).toBe(true);

	await host.page.getByRole('button', { name: 'botたんに抜けてもらう' }).click();
	await expect(botRow).toHaveCount(0, slow);
	await cleanup(host.did, listener.did);
});

// BOT-02 空きが無い / 空きができる
test('botたんに空きが無いと呼べず、空きができたら呼べるようになる', async ({ browser }) => {
	test.setTimeout(90_000);
	await setBotCapacity(0);
	const host = await openAs(browser);
	await createSpace(host.page, 'いっぱい');
	await expect(host.page.getByTestId('bot-busy')).toHaveText(
		'botたんは今いっぱいです。空いたら呼べます。',
		slow
	);
	await expect(host.page.getByRole('button', { name: 'botたんを呼ぶ' })).toBeDisabled();
	await setBotCapacity(1);
	await expect(host.page.getByRole('button', { name: 'botたんを呼ぶ' })).toBeEnabled(slow);
	await resetBotCapacity();
	await cleanup(host.did);
});

test('ホスト以外はbotたんを呼べない（BOT-01）', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'よべない');
	const listener = await openAs(browser);
	await join(listener.page, path);
	const response = await listener.page.request.post(`${path}/bot`, {
		headers: { origin: new URL(listener.page.url()).origin },
		data: { action: 'invite' }
	});
	expect(response.status()).toBe(403);
	await cleanup(host.did, listener.did);
});

// BOT-06 会話中にconvoが止まる
test('botたんとconvoの接続が切れたら、botたんは退出しホストに知らせ、人間の会話は続く', async ({
	browser
}) => {
	test.setTimeout(120_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'しょうがい');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await join(listener.page, path);
	await host.page.getByRole('button', { name: 'botたんを呼ぶ' }).click(connected);
	const botRow = host.page.locator('[data-testid="participants"] li[data-role="bot"]');
	await expect(botRow).toBeVisible(slow);

	await fetch(`${FAKE_CONVO_URL}/test/drop`, { method: 'POST' });
	await expect(botRow).toHaveCount(0, slow);
	await expect(host.page.getByTestId('bot-left')).toContainText('botたんは退出しました', slow);
	await expect(host.page.getByRole('button', { name: 'botたんを呼ぶ' })).toBeVisible();
	await expect(listener.page.getByTestId('connection-state')).toHaveText('接続しました');
	await cleanup(host.did, listener.did);
});

// BOT-04 botたんの返事中にスピーカーが話す（偽の convo は割り込みを数える）
test('スピーカーが話し始めるたびに、botたんの返事を止める合図を送る', async ({ browser }) => {
	test.setTimeout(90_000);
	await setBotCapacity(2);
	const before = (
		(await (await fetch(`${FAKE_CONVO_URL}/test/texts`)).json()) as { interrupts: number }
	).interrupts;
	const host = await openAs(browser);
	await createSpace(host.page, 'わりこみ');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await host.page.getByRole('button', { name: 'botたんを呼ぶ' }).click(connected);
	await expect(host.page.locator('[data-testid="participants"] li[data-role="bot"]')).toBeVisible(
		slow
	);
	await speak(host.page);
	await expect
		.poll(
			async () =>
				((await (await fetch(`${FAKE_CONVO_URL}/test/texts`)).json()) as { interrupts: number })
					.interrupts,
			slow
		)
		.toBeGreaterThan(before);
	await cleanup(host.did);
});

// TRANS-03 混雑する / 混雑が解消する
test('字幕が一時停止したら表示を切り替え、再開したら消す', async ({ browser }) => {
	const host = await openAs(browser);
	await createSpace(host.page, 'こんざつ');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	// space-agent が字幕のつなぎを開くまで待ってから、混雑を知らせる
	await expect
		.poll(async () => {
			await fetch(`${FAKE_CONVO_URL}/test/pause`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ paused: true })
			});
			return host.page.getByTestId('captions-paused').count();
		}, slow)
		.toBe(1);
	await expect(host.page.getByTestId('captions-paused')).toHaveText('字幕は一時停止中です。');
	await fetch(`${FAKE_CONVO_URL}/test/pause`, {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ paused: false })
	});
	await expect(host.page.getByTestId('captions-paused')).toHaveCount(0, connected);
	await cleanup(host.did);
});

// LIFE-02 botたんSpace は作成と同時に botたんを招待する
test('botたんSpaceを作るとbotたんが自動で加わる', async ({ browser }) => {
	test.setTimeout(90_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	await createSpace(host.page, 'ふたりきり', 'bot');
	await expect(host.page.locator('[data-testid="participants"] li[data-role="bot"]')).toContainText(
		'botたん',
		slow
	);
	await cleanup(host.did);
});
