import { expect, test, type Page } from '@playwright/test';
import { FAKE_CONVO_URL } from '../../playwright.config.ts';
import { db } from './fixtures/session.ts';
import {
	cleanup,
	createSpace,
	openAs,
	resetBotCapacity,
	setBotCapacity
} from './fixtures/space.ts';

const connected = { timeout: 15000 };
const slow = { timeout: 25000 };

async function join(page: Page, path: string) {
	await page.goto(path);
	await expect(page.getByTestId('connection-state')).toHaveText('接続しました', connected);
}

const comment = (page: Page, path: string, text: unknown) =>
	page.request.post(`${path}/comment`, {
		headers: { origin: new URL(page.url()).origin },
		data: { text }
	});

async function sendFromSheet(page: Page, text: string) {
	const sheetOpen = await page.getByTestId('comment-form').isVisible();
	if (!sheetOpen) await page.getByRole('button', { name: 'リアクション' }).click();
	await page.getByLabel('コメント', { exact: true }).fill(text);
	await page.getByTestId('comment-form').getByRole('button', { name: '送る' }).click();
}

// COMM-01 聴衆がコメントを送る / COMM-02 コメントが届く
test('聴衆のコメントは、ホストと別の聴衆の画面に流れ、「字幕とコメント」の欄に並ぶ', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'コメント');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const listener = await openAs(browser);
	await join(listener.page, path);
	const other = await openAs(browser);
	await join(other.page, path);

	await sendFromSheet(listener.page, 'わかる');
	for (const page of [host.page, other.page, listener.page]) {
		await expect(
			page.locator(`[data-testid="comment"][data-from="${listener.did}"]`)
		).toContainText('わかる', connected);
		const line = page.locator(`[data-testid="comment-line"][data-from="${listener.did}"]`);
		await expect(line).toContainText('わかる');
		await expect(line).toContainText('コメント');
	}
	await expect(host.page.getByTestId('captions')).toContainText('字幕とコメント');
	// 送れたらシートが閉じ、フォーカスは「リアクション」に戻る。開き直すと入力欄は空
	await expect(listener.page.getByTestId('comment-form')).toHaveCount(0);
	await expect(listener.page.getByRole('button', { name: 'リアクション' })).toBeFocused();
	await listener.page.getByRole('button', { name: 'リアクション' }).click();
	await expect(listener.page.getByLabel('コメント', { exact: true })).toHaveValue('');
	await cleanup(host.did, listener.did, other.did);
});

// COMM-01 30字を超える / COMM-03 空白だけ・HTML
test('31字以上と空白だけは送れず、HTMLは文字のまま表示される', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ながさ');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await host.page.getByRole('button', { name: 'リアクション' }).click();
	const input = host.page.getByLabel('コメント', { exact: true });
	const send = host.page.getByTestId('comment-form').getByRole('button', { name: '送る' });
	await input.fill('あ'.repeat(31));
	await expect(send).toBeDisabled();
	await expect(host.page.getByText('30字までです')).toBeVisible();
	await input.fill('   ');
	await expect(send).toBeDisabled();
	await input.fill('あ'.repeat(30));
	await expect(host.page.getByText('あと0字')).toBeVisible();
	await expect(send).toBeEnabled();

	expect((await comment(host.page, path, 'あ'.repeat(31))).status()).toBe(400);
	expect((await comment(host.page, path, '   ')).status()).toBe(400);

	await sendFromSheet(host.page, '<b>太字</b>');
	const flowing = host.page.locator('[data-testid="comment"]').last();
	await expect(flowing).toContainText('<b>太字</b>', connected);
	await expect(host.page.locator('[data-testid="comment-line"] b')).toHaveCount(0);
	await cleanup(host.did);
});

// COMM-03 連投する
test('コメントは10秒に3件までで、4件目は拒否される', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'れんとう');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const statuses: number[] = [];
	for (let i = 0; i < 4; i++) statuses.push((await comment(host.page, path, `その${i}`)).status());
	expect(statuses).toEqual([204, 204, 204, 429]);
	await host.page.getByRole('button', { name: 'リアクション' }).click();
	await host.page.getByLabel('コメント', { exact: true }).fill('まだ送る');
	await host.page.getByTestId('comment-form').getByRole('button', { name: '送る' }).click();
	await expect(host.page.getByText('少し待ってから送ってください。')).toBeVisible();
	// 送れなかったときはシートを開いたまま、文面を残す（COMM-01）
	await expect(host.page.getByTestId('comment-form')).toBeVisible();
	await expect(host.page.getByLabel('コメント', { exact: true })).toHaveValue('まだ送る');
	await cleanup(host.did);
});

// COMM-01 入室していない人が送る
test('入室していない人はコメントを送れない', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'そとからコメント');
	const outsider = await openAs(browser);
	await outsider.page.goto('/');
	expect((await comment(outsider.page, path, 'こんにちは')).status()).toBe(403);
	await cleanup(host.did, outsider.did);
});

// COMM-01 botたんSpace
test('botたんSpace ではコメントの入力欄が無く、API も受け付けない', async ({ browser }) => {
	await setBotCapacity(1);
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ふたりきり', 'bot');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await host.page.getByRole('button', { name: 'リアクション' }).click();
	await expect(host.page.getByTestId('emoji-picker')).toBeVisible();
	await expect(host.page.getByTestId('comment-form')).toHaveCount(0);
	expect((await comment(host.page, path, 'こんにちは')).status()).toBe(403);
	await resetBotCapacity();
	await cleanup(host.did);
});

// COMM-02 ミュートしている人のコメント / COMM-04 あとから入室する
test('ミュートしている人のコメントは自分の画面に出ず、あとから入室した人に前のコメントは出ない', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ミュートとコメント');
	const listener = await openAs(browser);
	await db.set(`nagi:mutes:${host.did}`, JSON.stringify([listener.did]), { ttlSeconds: 300 });
	await host.page.reload();
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await join(listener.page, path);
	const other = await openAs(browser);
	await join(other.page, path);

	expect((await comment(listener.page, path, 'みえるかな')).status()).toBe(204);
	await expect(
		other.page.locator(`[data-testid="comment-line"][data-from="${listener.did}"]`)
	).toBeVisible(connected);
	await expect(host.page.locator(`[data-from="${listener.did}"]`)).toHaveCount(0);

	// E2E の入室者の上限は3人なので、1人抜けてからあとの人が入る
	await other.context.close();
	const late = await openAs(browser);
	await join(late.page, path);
	await expect(late.page.locator('[data-testid="comment-line"]')).toHaveCount(0);
	await db.del(`nagi:mutes:${host.did}`);
	await cleanup(host.did, listener.did, other.did, late.did);
});

// COMM-02 欄を読み返している
test('欄を上に戻して読んでいる間は、新しいコメントで位置が動かない', async ({ browser }) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'よみかえし');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	// E2E の入室者の上限（3人）の中で、欄があふれるまで並べる（1人3件まで）
	const listeners = [await openAs(browser), await openAs(browser)];
	for (const l of listeners) await join(l.page, path);
	for (const page of [host.page, ...listeners.map((l) => l.page)])
		for (let i = 0; i < 3; i++) await comment(page, path, `${i}行目のコメントです`);
	const timeline = host.page.getByTestId('timeline');
	await expect(host.page.locator('[data-testid="comment-line"]')).toHaveCount(9, connected);
	const atBottom = () =>
		timeline.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight <= 24);
	await expect.poll(atBottom).toBe(true);

	await timeline.evaluate((el) => el.scrollTo({ top: 0 }));
	await host.page.waitForTimeout(10_500);
	await comment(listeners[0].page, path, '新しいコメント');
	await expect(host.page.locator('[data-testid="comment-line"]')).toHaveCount(10, connected);
	expect(await timeline.evaluate((el) => el.scrollTop)).toBe(0);
	await cleanup(host.did, ...listeners.map((l) => l.did));
});

// COMM-05 botたんの参加中にコメントが届く
test('botたんの参加中に送ったコメントは、botたんに届かない', async ({ browser }) => {
	test.setTimeout(90_000);
	await setBotCapacity(2);
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'botたんとコメント');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await host.page.getByRole('button', { name: 'botたんを呼ぶ' }).click(connected);
	await expect(host.page.locator('[data-testid="participants"] li[data-role="bot"]')).toBeVisible(
		slow
	);
	const listener = await openAs(browser);
	await join(listener.page, path);
	expect((await comment(listener.page, path, 'botたんこんにちは')).status()).toBe(204);
	await expect(
		host.page.locator(`[data-testid="comment-line"][data-from="${listener.did}"]`)
	).toBeVisible(connected);
	await host.page.waitForTimeout(3000);
	const sent = (await (await fetch(`${FAKE_CONVO_URL}/test/texts`)).json()) as { texts: string[] };
	expect(sent.texts.some((text) => text.includes('botたんこんにちは'))).toBe(false);
	await host.page.getByRole('button', { name: 'botたんに抜けてもらう' }).click();
	await resetBotCapacity();
	await cleanup(host.did, listener.did);
});
