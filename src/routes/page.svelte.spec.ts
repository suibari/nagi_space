import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Page from './+page.svelte';

describe('/+page.svelte', () => {
	it('アプリ名の見出しを表示する', async () => {
		render(Page);
		await expect.element(page.getByRole('heading', { level: 1 })).toHaveTextContent('Nagi Space');
	});
});
