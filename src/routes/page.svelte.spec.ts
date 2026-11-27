import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

const props = (did?: string, nagiUser = did ? 'registered' : 'anonymous') =>
	({ data: { did, nagiUser, locale: 'ja' as const, spaces: [] }, params: {} }) as never;

describe('/+page.svelte', () => {
	it('未ログインなら説明とログインへの導線を出し、一覧は出さない（LAND-01・LAND-02）', async () => {
		render(Page, props());
		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Nagi のみんなと、声でゆるくおしゃべり');
		await expect
			.element(page.getByRole('link', { name: 'Nagi のアカウントではじめる' }).first())
			.toHaveAttribute('href', '/login');
		await expect.element(page.getByRole('link', { name: 'Nagi へ' })).toBeVisible();
		await expect.element(page.getByTestId('live-spaces')).not.toBeInTheDocument();
		await expect.element(page.getByTestId('no-spaces')).not.toBeInTheDocument();
	});

	it('英語なら説明を英語で出す', async () => {
		render(Page, {
			data: { did: undefined, nagiUser: 'anonymous', locale: 'en', spaces: [] },
			params: {}
		} as never);
		await expect
			.element(page.getByRole('heading', { level: 1 }))
			.toHaveTextContent('Hang out and talk with the Nagi community');
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
