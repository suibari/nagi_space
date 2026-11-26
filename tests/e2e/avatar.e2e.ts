import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs, setBotCapacity } from './fixtures/space.ts';

const connected = { timeout: 15000 };
const slow = { timeout: 30000 };

// BOT-05 botたんが話す（3Dモデルの読み込みは、モデルのフォルダを渡したときだけ確かめる）
test('botたんが参加すると3Dモデルを表示し、返事の動きのカテゴリを受け取る', async ({ browser }) => {
	test.setTimeout(120_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	await createSpace(host.page, '3dのテスト');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await host.page.getByRole('button', { name: 'botたんを呼ぶ' }).click(connected);
	const avatar = host.page.getByTestId('bot-avatar');
	await expect(avatar).toBeVisible(slow);
	if (process.env.E2E_BOT_ASSETS_DIR) {
		await expect(avatar).toHaveAttribute('data-state', 'ready', slow);
	}
	await host.context.grantPermissions(['microphone'], { origin: new URL(host.page.url()).origin });
	await host.page.getByRole('button', { name: 'マイクをオンにする' }).click();
	// 偽の convo は返事のたびに happy の動きを送る
	await expect(avatar).toHaveAttribute('data-motion', 'happy', slow);
	await cleanup(host.did);
});
