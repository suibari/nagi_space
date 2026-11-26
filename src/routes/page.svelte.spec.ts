import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

const props = (did?: string, nagiUser = did ? 'registered' : 'anonymous') =>
	({ data: { did, nagiUser, locale: 'ja' as const, spaces: [] }, params: {} }) as never;

describe('/+page.svelte', () => {
	it('未ログインならログインのリンクを表示する', async () => {
		render(Page, props());
		await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent('Nagi Space');
		await expect.element(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
	});

	it('ログイン中ならログアウトのボタンを表示する', async () => {
		render(Page, props('did:plc:alice'));
		await expect.element(page.getByRole('button', { name: 'ログアウト' })).toBeVisible();
	});

	it('Nagi未登録ならNagiで登録する案内を表示する', async () => {
		render(Page, props('did:plc:alice', 'unregistered'));
		await expect.element(page.getByTestId('unregistered')).toBeVisible();
		await expect.element(page.getByRole('link', { name: 'Nagi を開く' })).toBeVisible();
	});

	it('登録を確認できなければ再読み込みの案内を表示する', async () => {
		render(Page, props('did:plc:alice', 'unknown'));
		const notice = page.getByTestId('registration-unknown');
		await expect.element(notice).toBeVisible();
		expect(notice.element().textContent).toContain('確認できませんでした');
	});
});
