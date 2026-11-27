import { expect, test, type Page } from '@playwright/test';
import { db } from './fixtures/session.ts';
import {
	cleanup,
	createSpace,
	memberDid,
	openAs,
	resetBotCapacity,
	setBotCapacity
} from './fixtures/space.ts';

const connected = { timeout: 15000 };
const slow = { timeout: 25000 };
const PIXEL = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
	'base64'
);

async function join(page: Page, path: string) {
	await page.goto(path);
	await expect(page.getByTestId('connection-state')).toHaveText('接続しました', connected);
}

const overflowX = (page: Page) =>
	page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

// LOOK-08 Spaceを開始する
test('「開始する」は応答まで処理中になり、続けて押しても Space は1つだけ', async ({ browser }) => {
	const host = await openAs(browser);
	// サーバーの応答を遅らせて、処理中の表示を確かめる
	await host.page.route('**/spaces/new', async (route) => {
		if (route.request().method() === 'POST') await new Promise((r) => setTimeout(r, 1500));
		await route.continue();
	});
	await host.page.goto('/spaces/new');
	await host.page.getByLabel('タイトル').fill('ひとつだけ');
	const submit = host.page.getByRole('button', { name: '開始する' });
	await submit.click();
	await expect(submit).toHaveAttribute('aria-busy', 'true');
	await expect(submit).toBeDisabled();
	await submit.click({ force: true }).catch(() => undefined);
	await expect(host.page).toHaveURL(/\/s\/[a-z2-9]{12}$/, connected);
	const id = await db.get(`space:host:${host.did}`);
	expect(id).toBe(new URL(host.page.url()).pathname.slice(3));
	await cleanup(host.did);
});

// LOOK-08 botたんの招待が失敗する
test('botたんの招待が失敗したらスピナーが消え、理由が出て、もう一度押せる', async ({ browser }) => {
	await setBotCapacity(1);
	const host = await openAs(browser);
	const path = await createSpace(host.page, '招待の失敗');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await host.page.route(`**${path}/bot`, async (route) => {
		if (route.request().method() !== 'POST') return route.continue();
		await new Promise((r) => setTimeout(r, 800));
		await route.fulfill({ status: 500, body: '{}', contentType: 'application/json' });
	});
	const invite = host.page.getByRole('button', { name: 'botたんを呼ぶ' });
	await expect(invite).toBeEnabled(slow);
	await invite.click();
	await expect(host.page.getByRole('button', { name: /botたんを呼ぶ/ })).toHaveAttribute(
		'aria-busy',
		'true'
	);
	await expect(host.page.getByTestId('bot-failed')).toHaveText(
		'botたんを呼べませんでした。もう一度お試しください。'
	);
	await expect(invite).not.toHaveAttribute('aria-busy', 'true');
	await expect(invite).toBeEnabled();
	await resetBotCapacity();
	await cleanup(host.did);
});

// LOOK-08 マイクの切り替え
test('マイクを押してから切り替わるまで、ボタンが処理中になる', async ({ browser }) => {
	const host = await openAs(browser);
	// マイクの許可を遅らせて、処理中の表示を確かめる
	await host.page.addInitScript(() => {
		const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
		navigator.mediaDevices.getUserMedia = async (constraints) => {
			await new Promise((r) => setTimeout(r, 1000));
			return original(constraints);
		};
	});
	const path = await createSpace(host.page, 'マイクの処理中');
	await host.context.grantPermissions(['microphone'], { origin: new URL(host.page.url()).origin });
	await join(host.page, path);
	const mic = host.page.getByRole('button', { name: 'マイクをオンにする' });
	await mic.click();
	await expect(host.page.locator('[data-testid="action-bar"] [aria-busy="true"]')).toHaveCount(1);
	await expect(host.page.getByRole('button', { name: 'ミュートする' }).first()).toBeVisible(
		connected
	);
	await expect(host.page.locator('[data-testid="action-bar"] [aria-busy="true"]')).toHaveCount(0);
	await cleanup(host.did);
});

// LOOK-07 アイコンを設定していない参加者 / アイコンは承認後も残る（design.md D6）
test('参加者はアイコンで並び、アイコンの無い人は頭文字。承認でスピーカーになってもアイコンが残る', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'アイコン');
	const listener = await openAs(browser, memberDid('pic'));
	for (const page of [host.page, listener.page]) {
		await page.route('https://avatar.test/**', (route) =>
			route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL })
		);
	}
	await join(listener.page, path);
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);

	const hostTile = host.page.locator('[data-testid="participants"] li[data-role="host"]');
	await expect(hostTile.getByTestId('avatar-initial')).toHaveText('テ');
	const listenerTile = host.page.locator(`[data-testid="participants"] li[data-role="listener"]`);
	await expect(listenerTile.locator('img[src="https://avatar.test/pic.png"]')).toBeVisible(
		connected
	);

	await listener.page.getByRole('button', { name: '発話をリクエスト' }).click();
	await host.page.getByTestId('requests').getByRole('button', { name: '承認する' }).click();
	await listener.context.grantPermissions(['microphone'], {
		origin: new URL(listener.page.url()).origin
	});
	await listener.page.getByRole('button', { name: 'マイクを許可してスピーカーになる' }).click();
	const speakerTile = host.page.locator(`[data-testid="participants"] li[data-role="speaker"]`);
	await expect(speakerTile.locator('img[src="https://avatar.test/pic.png"]')).toBeVisible(
		connected
	);
	await cleanup(host.did, listener.did);
});

// LOOK-07 スピーカーが話す
test('話しているスピーカーには話している表示が付く', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'はなす');
	await host.context.grantPermissions(['microphone'], { origin: new URL(host.page.url()).origin });
	await join(host.page, path);
	const listener = await openAs(browser);
	await join(listener.page, path);
	await host.page.getByRole('button', { name: 'マイクをオンにする' }).click();
	const hostTile = listener.page.locator('[data-testid="participants"] li[data-role="host"]');
	// 偽のマイクは短く鳴るだけなので、話している表示が一度でも付けばよい
	await expect
		.poll(() => hostTile.getAttribute('data-speaking'), { timeout: 20000, intervals: [100] })
		.toBe('true');
	await expect(hostTile).toContainText('話しています');
	await cleanup(host.did, listener.did);
});

// LOOK-05 参加者の一覧までスクロールする / BOT-05 スマートフォンで表示する
test('幅360pxで、下までスクロールしても操作バーが押せ、3Dモデルの枠は幅いっぱい', async ({
	browser
}) => {
	test.setTimeout(90_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	await host.page.setViewportSize({ width: 360, height: 740 });

	const path = await createSpace(host.page, 'せまい画面');
	await join(host.page, path);
	await host.page.getByRole('button', { name: 'botたんを呼ぶ' }).click(connected);
	const frame = host.page.getByTestId('bot-avatar');
	await expect(frame).toBeVisible(slow);
	const box = await frame.boundingBox();
	// 左右16pxの余白を除いた幅いっぱい
	expect(Math.round(box!.width)).toBe(360 - 32);

	await host.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
	const bar = host.page.getByTestId('action-bar');
	await expect(bar).toBeInViewport();
	await host.page.getByRole('button', { name: '絵文字' }).click();
	await expect(host.page.getByTestId('emoji-picker')).toBeVisible();
	expect(await overflowX(host.page)).toBeLessThanOrEqual(0);
	// 絵文字のシートを閉じてから botたんの操作を押す（シートは下の本文を覆う）
	await host.page.getByRole('button', { name: '閉じる' }).click();
	await host.page.getByRole('button', { name: 'botたんに抜けてもらう' }).click();
	await cleanup(host.did);
});

// BOT-05 広い画面
test('幅1280pxでは、3Dモデルの枠は中央の段の幅いっぱい', async ({ browser }) => {
	test.setTimeout(90_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	await host.page.setViewportSize({ width: 1280, height: 900 });
	const path = await createSpace(host.page, 'ひろい画面');
	await join(host.page, path);
	await host.page.getByRole('button', { name: 'botたんを呼ぶ' }).click(connected);
	const frame = host.page.getByTestId('bot-avatar');
	await expect(frame).toBeVisible(slow);
	const box = await frame.boundingBox();
	// 中央の段の幅いっぱいで、高さは画面の高さの55%までに収まる
	expect(Math.round(box!.width)).toBe(640 - 32);
	expect(Math.round(box!.height)).toBeLessThanOrEqual(Math.round(900 * 0.55) + 1);
	await host.page.getByRole('button', { name: 'botたんに抜けてもらう' }).click();
	await cleanup(host.did);
});

// REACT-01 聴衆が絵文字を送る / 絵文字が一度にたくさん届く
test('絵文字は大きく流れ、流れている間も操作バーは押せる', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, '大きな絵文字');
	await join(host.page, path);
	await host.page.getByRole('button', { name: '絵文字' }).click();
	const picker = host.page.getByTestId('emoji-picker');
	await picker.locator('[data-emoji="u:🎉"]').click();
	await picker.locator('[data-emoji="u:👏"]').click();
	const reaction = host.page.locator('[data-testid="reaction"]').first();
	await expect(reaction).toBeVisible(connected);
	const size = await reaction.evaluate((el) =>
		parseFloat(getComputedStyle(el.querySelector('span')!).fontSize)
	);
	expect(size).toBeGreaterThanOrEqual(40);
	// 流れる層は操作を受け付けないので、下のボタンを押せる
	await host.page.getByRole('button', { name: '絵文字' }).click();
	await expect(picker).toHaveCount(0);
	await cleanup(host.did);
});

// REACT-01 視差効果を減らしている
test('視差効果を減らす設定では、絵文字は流れずにその場で出る', async ({ browser }) => {
	const host = await openAs(browser);
	await host.page.emulateMedia({ reducedMotion: 'reduce' });
	const path = await createSpace(host.page, '動きを減らす');
	await join(host.page, path);
	await host.page.getByRole('button', { name: '絵文字' }).click();
	await host.page.getByTestId('emoji-picker').locator('[data-emoji="u:🎉"]').click();
	const reaction = host.page.locator('[data-testid="reaction"]').first();
	await expect(reaction).toBeVisible(connected);
	const animation = await reaction.evaluate((el) => getComputedStyle(el).animationName);
	expect(animation).toContain('appear');
	expect(animation).not.toContain('rise');
	await cleanup(host.did);
});

// LAND-01 未ログインでトップを開く / LAND-02 説明からログインする
test('未ログインのトップは説明を出し、導線からログイン画面へ進める', async ({ browser }) => {
	const context = await browser.newContext({ locale: 'ja-JP' });
	const page = await context.newPage();
	await page.goto('/');
	await expect(page.getByRole('heading', { level: 1 })).toHaveText(
		'Nagi のみんなと、声でゆるくおしゃべり'
	);
	await expect(page.getByTestId('live-spaces')).toHaveCount(0);
	await expect(page.getByRole('link', { name: 'Nagi へ' })).toHaveAttribute(
		'href',
		'https://nagi.suibari.com/'
	);
	await page.getByRole('link', { name: 'Nagi のアカウントではじめる' }).first().click();
	await expect(page).toHaveURL(/\/login$/);
	await expect(page.getByLabel('ハンドル')).toBeVisible();
	await context.close();
});

// LAND-01 ログイン中にトップを開く
test('ログイン中のトップは説明ではなく開催中の一覧を出す', async ({ browser }) => {
	const user = await openAs(browser);
	await user.page.goto('/');
	await expect(user.page.getByTestId('signed-in')).toBeVisible();
	await expect(user.page.getByRole('link', { name: 'Nagi のアカウントではじめる' })).toHaveCount(0);
	await cleanup(user.did);
});
