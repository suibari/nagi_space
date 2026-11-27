import { page } from 'vitest/browser';
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import Avatar from './Avatar.svelte';

const PIXEL =
	'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

describe('Avatar', () => {
	it('URL があれば画像を出す', async () => {
		render(Avatar, { src: PIXEL, name: 'すいばり' });
		expect(document.querySelector('.avatar img')?.getAttribute('src')).toBe(PIXEL);
		await expect.element(page.getByTestId('avatar-initial')).not.toBeInTheDocument();
	});

	it('URL が無ければ表示名の頭文字を出す', async () => {
		render(Avatar, { name: 'alice' });
		await expect.element(page.getByTestId('avatar-initial')).toHaveTextContent('A');
	});
});
