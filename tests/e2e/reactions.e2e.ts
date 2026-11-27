import { expect, test, type Page } from '@playwright/test';
import { db } from './fixtures/session.ts';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 15000 };

async function join(page: Page, path: string) {
	await page.goto(path);
	await expect(page.getByTestId('connection-state')).toHaveText('接続しました', connected);
}

const react = (page: Page, path: string, choice: unknown) =>
	page.request.post(`${path}/react`, {
		headers: { origin: new URL(page.url()).origin },
		data: { choice }
	});

// REACT-01 聴衆が絵文字を送る / REACT-04 リアクションを残さない
test('聴衆が送った絵文字は全員の画面に送った人と一緒に出て、しばらくすると消える', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'えもじ');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await join(listener.page, path);

	await listener.page.getByRole('button', { name: 'リアクション' }).click();
	await listener.page.getByTestId('emoji-picker').locator('[data-emoji="u:🎉"]').click();
	const onHost = host.page.locator(`[data-testid="reaction"][data-from="${listener.did}"]`);
	await expect(onHost).toContainText('🎉', connected);
	await expect(listener.page.locator('[data-testid="reaction"]')).toContainText('🎉');
	await expect(onHost).toHaveCount(0, { timeout: 8000 });

	// あとから入った人には、入室前の絵文字は出ない
	const late = await openAs(browser);
	await join(late.page, path);
	await expect(late.page.locator('[data-testid="reaction"]')).toHaveCount(0);
	await cleanup(host.did, listener.did, late.did);
});

// REACT-02 カスタム絵文字を検索して送る
test('カスタム絵文字を検索して送れ、検索結果ではUnicode絵文字より先に出る', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'カスタム');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await join(listener.page, path);
	await listener.page.getByRole('button', { name: 'リアクション' }).click();
	const picker = listener.page.getByTestId('emoji-picker');
	await picker.getByLabel('絵文字をさがす').fill('ねこ');
	const custom = picker.locator(
		'[data-emoji="c:at://did:plc:emojiowner/blue.moji.collection.item/neko"]'
	);
	await expect(custom).toBeVisible(connected);
	// カスタム絵文字の見出しが Unicode 絵文字の見出しより先
	const headings = await picker.locator('h4').allTextContents();
	expect(headings.indexOf('カスタム絵文字')).toBeLessThan(headings.indexOf('絵文字'));
	await custom.click();
	await expect(
		host.page.locator(`[data-testid="reaction"][data-from="${listener.did}"] img`)
	).toHaveAttribute('alt', 'ねこ', connected);

	// 存在しないカスタム絵文字は送れない
	const response = await react(listener.page, path, {
		kind: 'custom',
		emoji: { uri: 'at://did:plc:x/blue.moji.collection.item/gone' }
	});
	expect(response.status()).toBe(400);
	await cleanup(host.did, listener.did);
});

// REACT-03 連打する
test('短時間に送りすぎた分は配られず、少し待つよう表示する', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'れんだ');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await join(listener.page, path);
	const statuses: number[] = [];
	for (let i = 0; i < 9; i++)
		statuses.push((await react(listener.page, path, { kind: 'unicode', emoji: '👏' })).status());
	expect(statuses.slice(0, 8)).toEqual(Array(8).fill(204));
	expect(statuses[8]).toBe(429);
	await expect(
		host.page.locator(`[data-testid="reaction"][data-from="${listener.did}"]`)
	).toHaveCount(8, connected);

	await listener.page.getByRole('button', { name: 'リアクション' }).click();
	await listener.page.getByTestId('emoji-picker').locator('[data-emoji="u:👏"]').click();
	await expect(listener.page.getByText('少し待ってから送ってください。')).toBeVisible();
	await cleanup(host.did, listener.did);
});

// PART-09 ミュートしている人の絵文字
test('自分がミュートしている人の絵文字は自分の画面に出ず、ほかの人の画面には出る', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ミュートとえもじ');
	const listener = await openAs(browser);
	await db.set(`nagi:mutes:${host.did}`, JSON.stringify([listener.did]), { ttlSeconds: 300 });
	await host.page.reload();
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await join(listener.page, path);
	const other = await openAs(browser);
	await join(other.page, path);

	expect((await react(listener.page, path, { kind: 'unicode', emoji: '🙌' })).status()).toBe(204);
	await expect(
		other.page.locator(`[data-testid="reaction"][data-from="${listener.did}"]`)
	).toBeVisible(connected);
	await expect(
		host.page.locator(`[data-testid="reaction"][data-from="${listener.did}"]`)
	).toHaveCount(0);
	await db.del(`nagi:mutes:${host.did}`);
	await cleanup(host.did, listener.did, other.did);
});

test('入室していない人は絵文字を送れない', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'そとから');
	const outsider = await openAs(browser);
	await outsider.page.goto('/');
	const response = await react(outsider.page, path, { kind: 'unicode', emoji: '👏' });
	expect(response.status()).toBe(403);
	await cleanup(host.did, outsider.did);
});

// REACT-02 お気に入りを表示する
test('Nagi のお気に入りの絵文字を、選択の先頭に並べる', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'おきにいり');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	// AppView の getPreferences の代わりに、お気に入りを置く
	await db.set(
		`nagi:emojifav:${host.did}`,
		JSON.stringify([
			{ kind: 'unicode', emoji: '🦊' },
			{ kind: 'unicode', emoji: '🍙' }
		]),
		{ ttlSeconds: 300 }
	);
	await host.page.getByRole('button', { name: 'リアクション' }).click();
	const picker = host.page.getByTestId('emoji-picker');
	await expect(picker.locator('h4').first()).toHaveText('お気に入り');
	const first = picker.locator('[data-emoji]').first();
	await expect(first).toHaveAttribute('data-emoji', 'u:🦊');
	await db.del(`nagi:emojifav:${host.did}`);
	await cleanup(host.did);
});

// PART-10 特定の参加者にだけ送る（送り先を付けても、全員に届く）
test('絵文字に送り先を付けても、入室者全員に届く', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ぜんいんに');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const sender = await openAs(browser);
	await join(sender.page, path);
	const other = await openAs(browser);
	await join(other.page, path);
	const response = await sender.page.request.post(`${path}/react`, {
		headers: { origin: new URL(sender.page.url()).origin },
		data: {
			choice: { kind: 'unicode', emoji: '👋' },
			to: host.did,
			destinationIdentities: [host.did]
		}
	});
	expect(response.status()).toBe(204);
	for (const page of [host.page, other.page]) {
		await expect(page.locator(`[data-testid="reaction"][data-from="${sender.did}"]`)).toContainText(
			'👋',
			connected
		);
	}
	await cleanup(host.did, sender.did, other.did);
});
