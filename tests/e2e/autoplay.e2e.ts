import { expect, test } from '@playwright/test';
import { cleanup, createSpace, openAs } from './fixtures/space.ts';

const connected = { timeout: 15000 };

/**
 * 自動再生の制限を再現する。Chrome の判定は閲覧履歴などで変わるので、
 * 利用者がクリックするまで音声の再生（play）を拒むようにする。
 */
const blockAutoplayUntilClick = () => {
	let allowed = false;
	document.addEventListener('click', () => (allowed = true), true);
	const original = HTMLMediaElement.prototype.play;
	HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
		return allowed
			? original.call(this)
			: Promise.reject(new DOMException('autoplay blocked', 'NotAllowedError'));
	};
};

// PART-02 ブラウザが自動再生を止める
test('音声を再生できないときは「タップして音声を聞く」を出し、押すと消える', async ({
	browser
}) => {
	const host = await openAs(browser);
	const path = await createSpace(host.page, 'じどうさいせい');
	await expect(host.page.getByTestId('connection-state')).toHaveText('接続しました', connected);
	// ホストが話している状態にする（偽のマイク）
	await host.context.grantPermissions(['microphone'], { origin: new URL(host.page.url()).origin });
	await host.page.getByRole('button', { name: 'マイクをオンにする' }).click();
	await expect(host.page.getByRole('button', { name: 'ミュートする' })).toBeVisible(connected);

	const listener = await openAs(browser);
	await listener.page.addInitScript(blockAutoplayUntilClick);
	await listener.page.goto(path);
	const button = listener.page.getByRole('button', { name: 'タップして音声を聞く' });
	await expect(button).toBeVisible(connected);
	await button.click();
	await expect(button).toHaveCount(0, connected);
	await cleanup(host.did, listener.did);
});
