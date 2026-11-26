import { expect, test } from '@playwright/test';
import { db } from './fixtures/session.ts';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 15000 };

/** 本人のミュートの一覧を置く（AppView の getMutes の代わり。E2E の偽のログインでは取れない）。 */
const setMutes = (did: string, muted: string[]) =>
	db.set(`nagi:mutes:${did}`, JSON.stringify(muted), { ttlSeconds: 300 });

// PART-09 ミュートしている人がホストのSpace
test('自分がミュートしている人のSpaceは自分の一覧に出ないが、ほかの人の一覧には出る', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ミュートされたホスト');
	const id = path.split('/').pop()!;

	const muter = await openAs(browser);
	await setMutes(muter.did, [host.did]);
	await muter.page.goto('/');
	await expect(muter.page.locator(`[data-space-id="${id}"]`)).toHaveCount(0);

	const other = await openAs(browser);
	await other.page.goto('/');
	await expect(other.page.locator(`[data-space-id="${id}"]`)).toBeVisible();
	await db.del(`nagi:mutes:${muter.did}`);
	await cleanup(host.did, muter.did, other.did);
});

// PART-09 ホストがミュートしている人が入室する
test('ホストにミュートされていても、ほかの人と同じように入室して発話をリクエストできる', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'ミュートしても');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	const muted = await openAs(browser);
	await setMutes(host.did, [muted.did]);
	await muted.page.goto(path);
	await expect(muted.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	await muted.page.getByRole('button', { name: '発話をリクエスト' }).click();
	await expect(
		host.page.getByTestId('requests').locator(`li[data-did="${muted.did}"]`)
	).toBeVisible(connected);
	await db.del(`nagi:mutes:${host.did}`);
	await cleanup(host.did, muted.did);
});
