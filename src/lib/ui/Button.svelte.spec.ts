import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { createRawSnippet } from 'svelte';
import Button from './Button.svelte';

const text = (value: string) => createRawSnippet(() => ({ render: () => `<span>${value}</span>` }));

describe('Button', () => {
	it('pending のあいだは処理中として押せなくし、幅を変えない', async () => {
		render(Button, { children: text('開始する') });
		render(Button, { children: text('開始する'), pending: true });
		const idle = page.getByRole('button', { name: '開始する', exact: true });
		const busy = page.getByRole('button', { name: /処理中/ });
		await expect.element(busy).toHaveAttribute('aria-busy', 'true');
		await expect.element(busy).toBeDisabled();
		await expect.element(idle).toBeEnabled();
		const width = async (locator: typeof idle) =>
			(await locator.element()).getBoundingClientRect().width;
		expect(await width(busy)).toBe(await width(idle));
	});

	it('href を渡すとリンクになる', async () => {
		render(Button, { children: text('ログイン'), href: '/login', variant: 'primary' });
		await expect
			.element(page.getByRole('link', { name: 'ログイン' }))
			.toHaveAttribute('href', '/login');
	});
});
