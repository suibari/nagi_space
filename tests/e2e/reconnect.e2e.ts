import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 20000 };

// PART-08 スピーカーが一時的に切断する
test('スピーカーは通信が途切れても、スピーカーのまま再接続し、マイクの許可を求め直されない', async ({
	browser
}) => {
	test.setTimeout(90_000);
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'さいせつぞく');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const speaker = await openAs(browser);
	// 通信の途切れを再現するため、開いた WebSocket を覚えておく
	await speaker.page.addInitScript(() => {
		const sockets: WebSocket[] = [];
		(window as unknown as { __sockets: WebSocket[] }).__sockets = sockets;
		const Original = window.WebSocket;
		window.WebSocket = class extends Original {
			constructor(url: string | URL, protocols?: string | string[]) {
				super(url, protocols);
				sockets.push(this);
			}
		} as typeof WebSocket;
	});
	await speaker.page.goto(path);
	await expect(speaker.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
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
	await expect(speaker.page.getByRole('button', { name: '聴衆に戻る' })).toBeVisible(connected);

	// マイクの許可を求めたら数える
	await speaker.page.evaluate(() => {
		const w = window as unknown as { __gum: number };
		w.__gum = 0;
		const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
		navigator.mediaDevices.getUserMedia = (c) => {
			w.__gum += 1;
			return original(c);
		};
	});

	// 通信が途切れて戻る（シグナリングの接続を切る）。再接続はすぐ終わるので、
	// 途中の表示ではなく、新しい接続が開かれたことで確かめる
	const sockets = () =>
		speaker.page.evaluate(() => (window as unknown as { __sockets: WebSocket[] }).__sockets.length);
	const before = await sockets();
	await speaker.page.evaluate(() =>
		(window as unknown as { __sockets: WebSocket[] }).__sockets.forEach((socket) => socket.close())
	);
	await expect.poll(sockets, connected).toBeGreaterThan(before);
	await expect(speaker.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await expect(speaker.page.getByRole('button', { name: '聴衆に戻る' })).toBeVisible(connected);
	expect(await speaker.page.evaluate(() => (window as unknown as { __gum: number }).__gum)).toBe(0);

	// ページを開き直しても（トークンを取り直しても）スピーカーのまま
	await speaker.page.reload();
	await expect(speaker.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await expect(speaker.page.getByRole('button', { name: '聴衆に戻る' })).toBeVisible(connected);
	await expect(
		host.page.locator('[data-testid="participants"] li[data-role="speaker"]')
	).toHaveCount(1, connected);
	await cleanup(host.did, speaker.did);
});

// PART-08 一定時間戻らない参加者は退室扱いにする
test('戻らない参加者は参加者の一覧から消える', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'もどらない');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await listener.page.goto(path);
	await expect(host.page.locator('[data-testid="participants"] li')).toHaveCount(2, connected);
	await listener.context.close();
	await expect(host.page.locator('[data-testid="participants"] li')).toHaveCount(1, {
		timeout: 40000
	});
	await cleanup(host.did, listener.did);
});
