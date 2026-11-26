import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 15000 };

// マイクの許可を求めたかを数える
const countGetUserMedia = () => {
	const w = window as unknown as { __gumCalls: number };
	w.__gumCalls = 0;
	const original = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
	if (original) {
		navigator.mediaDevices.getUserMedia = (constraints) => {
			w.__gumCalls += 1;
			return original(constraints);
		};
	}
};

// PART-02 一覧から入室する / PART-01
test('聴衆はマイクの許可を求められずに入室し、マイクの操作も出ない', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ききせん');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);

	const listener = await openAs(browser);
	await listener.page.addInitScript(countGetUserMedia);
	await listener.page.goto('/');
	await listener.page.locator(`[data-space-id="${path.split('/').pop()}"]`).click();
	await expect(listener.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await expect(listener.page.getByRole('button', { name: 'マイクをオンにする' })).toHaveCount(0);
	const items = listener.page.getByTestId('participants').locator('li');
	await expect(items).toHaveCount(2);
	await expect(listener.page.locator('li[data-role="listener"]')).toHaveCount(1);
	await expect(listener.page.locator('li[data-role="host"]')).toHaveCount(1);
	expect(
		await listener.page.evaluate(() => (window as unknown as { __gumCalls: number }).__gumCalls)
	).toBe(0);
	await cleanup(host.did, listener.did);
});
