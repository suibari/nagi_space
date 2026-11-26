import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 15000 };

// PART-05 人間が2人だけのパブリックSpace / ホストが入室を絞ろうとする
test('人間が2人だけでも話せ、一覧に出たまま他の人も入れる。入室を絞る設定は無い', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ふたりだけ');
	const id = path.split('/').pop()!;
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const speaker = await openAs(browser);
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
	await expect(speaker.page.getByRole('button', { name: 'マイクをオンにする' })).toBeVisible(
		connected
	);

	const third = await openAs(browser);
	await third.page.goto('/');
	await expect(third.page.locator(`[data-space-id="${id}"]`)).toBeVisible();
	await third.page.goto(path);
	await expect(third.page.getByTestId('connection-state')).toHaveText('接続しました', connected);

	// 作成画面にも Space の画面にも、入室を絞る設定は存在しない
	for (const page of [host.page]) {
		await expect(page.getByText(/招待した人だけ|一覧から隠す|パスワード|ロック/)).toHaveCount(0);
	}
	await cleanup(host.did, speaker.did, third.did);
});
