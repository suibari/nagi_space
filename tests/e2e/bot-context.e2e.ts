import { expect, test } from '@playwright/test';
import { e2eEnv } from '../../playwright.config.ts';
import {
	cleanup,
	createSpace,
	openAs,
	resetBotCapacity,
	setBotCapacity
} from './fixtures/space.ts';

const connected = { timeout: 15000 };
const slow = { timeout: 25000 };
const agentHeaders = { authorization: `Bearer ${e2eEnv.AGENT_SECRET}` };

// BOT-08 パブリックSpace / 投稿を読めない
test('/agent/context は秘密が要り、パブリックSpace は空、読めない botたんSpace も空で botたんは参加する', async ({
	browser
}) => {
	test.setTimeout(90_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	const publicPath = await createSpace(host.page, 'みんなの場');
	const publicId = publicPath.split('/').pop()!;
	const request = host.page.request;
	const base = e2eEnv.PUBLIC_ORIGIN;

	expect((await request.get(`${base}/agent/context/${publicId}`)).status()).toBe(401);
	const pub = await request.get(`${base}/agent/context/${publicId}`, { headers: agentHeaders });
	expect(pub.status()).toBe(200);
	expect(await pub.json()).toEqual({ context: '' });
	await host.page.getByRole('button', { name: 'Space を終了する' }).click();
	await expect(host.page.getByTestId('ended')).toBeVisible(connected);
	await cleanup(host.did);

	// E2E のホストの DID は解決できないので、botたんSpace でも文脈は空になり、botたんは投稿なしで参加する
	const botHost = await openAs(browser);
	const botPath = await createSpace(botHost.page, 'ふたりで', 'bot');
	const botId = botPath.split('/').pop()!;
	const ctx = await request.get(`${base}/agent/context/${botId}`, { headers: agentHeaders });
	expect(await ctx.json()).toEqual({ context: '' });
	await expect(
		botHost.page.locator('[data-testid="participants"] li[data-role="bot"]')
	).toBeVisible(slow);
	await resetBotCapacity();
	await cleanup(botHost.did);
});
