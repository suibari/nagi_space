import { expect, test } from '@playwright/test';
import { db } from './fixtures/session.ts';
import { cleanup, openAs } from './fixtures/space.ts';

// LIFE-04 シェアの投稿に失敗する（E2E の偽のログインでは PDS に書き込めないので必ず失敗する）
test('シェアに失敗してもSpaceは始まり、ホストに再試行を出す', async ({ browser }) => {
	const host = await openAs(browser);
	await host.page.goto('/spaces/new');
	await host.page.getByLabel('タイトル').fill('シェアのテスト');
	await host.page.getByLabel('Nagi にシェアする').check();
	const text = host.page.getByLabel('投稿する文章');
	// 編集するまではタイトルに合わせた初期値
	await expect(text).toHaveValue('「シェアのテスト」の Space を始めました！');
	await text.fill('きてね！');
	await host.page.getByRole('button', { name: '開始する' }).click();

	await expect(host.page).toHaveURL(/\/s\/[a-z2-9]{12}$/, { timeout: 15000 });
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', {
		timeout: 15000
	});
	await expect(host.page.getByTestId('share-failed')).toContainText('シェアに失敗しました');
	const id = new URL(host.page.url()).pathname.split('/').pop()!;
	expect(await db.get(`space:sharedraft:${id}`)).toBe('きてね！');

	await host.page.getByRole('button', { name: 'もう一度シェアする' }).click();
	await expect(host.page.getByTestId('share-failed')).toBeVisible();
	await db.del(`space:sharedraft:${id}`);
	await cleanup(host.did);
});

test('シェアの本文が空なら開始しない', async ({ browser }) => {
	const host = await openAs(browser);
	await host.page.goto('/spaces/new');
	await host.page.getByLabel('タイトル').fill('からのシェア');
	await host.page.getByLabel('Nagi にシェアする').check();
	await host.page.getByLabel('投稿する文章').fill('   ');
	await host.page.getByRole('button', { name: '開始する' }).click();
	await expect(host.page.getByRole('alert')).toHaveText('投稿する文章を入力してください。');
	expect(await db.get(`space:host:${host.did}`)).toBeUndefined();
	await cleanup(host.did);
});

test('botたんSpaceにはシェアの操作を出さない', async ({ browser }) => {
	const host = await openAs(browser);
	await host.page.goto('/spaces/new');
	await expect(host.page.getByLabel('Nagi にシェアする')).toBeVisible();
	await host.page.getByLabel('botたんSpace').check();
	await expect(host.page.getByLabel('Nagi にシェアする')).toHaveCount(0);
	await cleanup(host.did);
});
