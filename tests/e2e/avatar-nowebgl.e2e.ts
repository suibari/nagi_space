import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs, setBotCapacity } from './fixtures/space.ts';

const connected = { timeout: 15000 };
const slow = { timeout: 30000 };

// WebGL が使えないブラウザを再現する
test.use({
	launchOptions: {
		args: ['--use-fake-device-for-media-stream', '--disable-webgl', '--disable-3d-apis']
	}
});

// BOT-05 WebGLが使えない
test('WebGLが使えないときは3Dモデルの代わりにbotたんのアイコンを出し、字幕は届く', async ({
	browser
}) => {
	test.setTimeout(120_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	await createSpace(host.page, 'アイコンのテスト');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await host.page.getByRole('button', { name: 'botたんを呼ぶ' }).click(connected);
	await expect(host.page.getByTestId('bot-avatar')).toHaveAttribute('data-state', 'fallback', slow);
	await expect(host.page.getByTestId('bot-icon')).toBeVisible();
	await host.context.grantPermissions(['microphone'], { origin: new URL(host.page.url()).origin });
	await host.page.getByRole('button', { name: 'マイクをオンにする' }).click();
	await expect(
		host.page.locator('[data-testid="caption-line"][data-speaker="bot:bot-tan"]').first()
	).toContainText('うんうん', slow);
	await cleanup(host.did);
});
