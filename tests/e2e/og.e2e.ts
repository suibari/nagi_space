import { writeFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs, setBotCapacity } from './fixtures/space.ts';

const ogImage = async (page: import('@playwright/test').Page) =>
	page.locator('meta[property="og:image"]').getAttribute('content');

// LOOK-04 パブリックSpaceのURL / botたんSpaceのURLを共有する
test('パブリックSpaceはタイトル入りのOGPを返し、botたんSpaceは共通のOGPを返す', async ({
	browser
}) => {
	test.setTimeout(90_000);
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'おしゃべり会');
	const id = path.split('/').pop()!;

	const anonymous = await browser.newContext({ locale: 'ja-JP' });
	const page = await anonymous.newPage();
	await page.goto(path);
	expect(await ogImage(page)).toBe(`http://127.0.0.1:4173/og/s/${id}.png`);
	await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
		'content',
		'おしゃべり会 | Nagi Space'
	);
	const spaceImage = await page.request.get(`/og/s/${id}.png`);
	expect(spaceImage.status()).toBe(200);
	expect(spaceImage.headers()['content-type']).toBe('image/png');
	if (process.env.E2E_OG_DIR) {
		await writeFile(`${process.env.E2E_OG_DIR}/space.png`, await spaceImage.body());
	}

	// botたんSpace は Space 固有の情報を出さない
	await setBotCapacity(2);
	const botHost = await openAs(browser);
	const botPath = await createSpace(botHost.page, 'ないしょのはなし', 'bot');
	const botId = botPath.split('/').pop()!;
	await page.goto(botPath);
	expect(await ogImage(page)).toBe('http://127.0.0.1:4173/og/default.png');
	await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'Nagi Space');
	const botImage = await (await page.request.get(`/og/s/${botId}.png`)).body();
	const defaultImage = await (await page.request.get('/og/default.png')).body();
	expect(Buffer.compare(botImage, defaultImage)).toBe(0);
	if (process.env.E2E_OG_DIR)
		await writeFile(`${process.env.E2E_OG_DIR}/default.png`, defaultImage);
	await cleanup(host.did, botHost.did);
});
