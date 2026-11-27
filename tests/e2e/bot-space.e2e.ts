import { expect, test, type Page } from '@playwright/test';
import { RoomServiceClient } from 'livekit-server-sdk';
import { FAKE_CONVO_URL, e2eEnv } from '../../playwright.config.ts';
import { db } from './fixtures/session.ts';
import { cleanup, openAs, resetBotCapacity, setBotCapacity } from './fixtures/space.ts';

const connected = { timeout: 15000 };
const slow = { timeout: 25000 };

async function startBotSpace(page: Page) {
	await page.goto('/spaces/new');
	await page.getByLabel('botたんSpace').check();
	// botたんSpace は名前を入れない（LIFE-01）
	await expect(page.getByLabel('タイトル')).toHaveCount(0);
	await page.getByRole('button', { name: '開始する' }).click();
	await expect(page).toHaveURL(/\/s\/[a-z2-9]{12}$/, connected);
	await expect(page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	return new URL(page.url()).pathname;
}

// LIFE-01 botたんSpaceを作成する / BOT-01 botたんSpaceで除外しようとする
test('botたんSpace は名前なしで始まり、botたんを外す操作が無く、API でも外せない', async ({
	browser
}) => {
	test.setTimeout(90_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	const path = await startBotSpace(host.page);
	await expect(host.page.getByTestId('space-title')).toHaveText('botたんとおしゃべり');
	await expect(host.page).toHaveTitle('botたんとおしゃべり | Nagi Space');
	await expect(host.page.locator('[data-testid="participants"] li[data-role="bot"]')).toBeVisible(
		slow
	);
	await expect(host.page.getByRole('button', { name: 'botたんに抜けてもらう' })).toHaveCount(0);
	const response = await host.page.request.post(`${path}/bot`, {
		headers: { origin: new URL(host.page.url()).origin },
		data: { action: 'remove' }
	});
	expect(response.status()).toBe(403);
	expect(await db.get(`space:${path.split('/').pop()}`)).toContain('botたんとおしゃべり');

	// space-agent の参加者は botたん1人だけ（字幕も受け持つ。simplify-bot-space D2）
	const rooms = new RoomServiceClient('http://127.0.0.1:7880', 'devkey', 'secret');
	await expect
		.poll(async () =>
			(await rooms.listParticipants(path.split('/').pop()!)).map((p) => p.identity).sort()
		)
		.toEqual(['bot:bot-tan', host.did].sort());
	await resetBotCapacity();
	await cleanup(host.did);
});

// LIFE-01 英語の表示
test('英語では botたんSpace の見出しが英語になる', async ({ browser }) => {
	test.setTimeout(90_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	await host.page.request.post('/settings/locale', {
		headers: { origin: e2eEnv.PUBLIC_ORIGIN },
		data: { locale: 'en' }
	});
	await host.page.goto('/spaces/new');
	await host.page.getByLabel('bot-tan Space').check();
	await host.page.getByRole('button', { name: 'Start' }).click();
	await expect(host.page.getByTestId('space-title')).toHaveText('Chat with bot-tan', connected);
	await resetBotCapacity();
	await cleanup(host.did);
});

// TRANS-01 botたんSpaceでホストが話す / BOT-06 botたんSpaceでconvoが止まる
test('botたんSpace ではホストの発話が字幕になり、botたんが落ちると字幕も止まり、呼び直せる', async ({
	browser
}) => {
	test.setTimeout(120_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	await startBotSpace(host.page);
	await expect(host.page.locator('[data-testid="participants"] li[data-role="bot"]')).toBeVisible(
		slow
	);
	await host.context.grantPermissions(['microphone'], { origin: new URL(host.page.url()).origin });
	await host.page.getByRole('button', { name: 'マイクをオンにする' }).click();
	await expect(
		host.page.locator(`[data-testid="caption-line"][data-speaker="${host.did}"]`).first()
	).toBeVisible(slow);
	await expect(
		host.page.locator('[data-testid="caption-line"][data-speaker="bot:bot-tan"]').first()
	).toBeVisible(slow);

	await fetch(`${FAKE_CONVO_URL}/test/drop`, { method: 'POST' });
	await expect(host.page.getByTestId('bot-left')).toBeVisible(slow);
	const reinvite = host.page.getByRole('button', { name: 'もう一度呼ぶ' });
	await expect(reinvite).toBeVisible();
	// 落ちている間は字幕も止まる
	const count = await host.page.locator('[data-testid="caption-line"]').count();
	await host.page.waitForTimeout(4000);
	expect(await host.page.locator('[data-testid="caption-line"]').count()).toBe(count);

	await expect(reinvite).toBeEnabled(slow);
	await reinvite.click();
	await expect(host.page.locator('[data-testid="participants"] li[data-role="bot"]')).toBeVisible({
		timeout: 60000
	});
	await expect
		.poll(() => host.page.locator('[data-testid="caption-line"]').count(), { timeout: 30000 })
		.toBeGreaterThan(count);
	await resetBotCapacity();
	await cleanup(host.did);
});
