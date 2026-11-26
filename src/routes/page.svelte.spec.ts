import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

const props = (did?: string) => ({ data: { did, locale: 'ja' as const }, params: {} }) as never;

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
});
