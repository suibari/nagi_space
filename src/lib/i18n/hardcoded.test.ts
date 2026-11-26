import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** 画面の文言は messages.ts にまとめる（LOOK-06）。画面に日本語を直接書いていないかを調べる。 */
const JAPANESE = /[぀-ヿ一-龯！-～]/;
// 意図した例外：言語の選択肢はその言語で書く。OGP はリンクカードを作る側が言語を送らないので日本語で書く
const ALLOWED = [/<option value="ja">日本語<\/option>/, /description: 'Nagi のみんなと/];

function svelteFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return svelteFiles(path);
		return path.endsWith('.svelte') ? [path] : [];
	});
}

describe('画面の文言', () => {
	it('画面に日本語を直接書かず、messages.ts から読む', () => {
		const found: string[] = [];
		for (const file of svelteFiles('src')) {
			const lines = readFileSync(file, 'utf8')
				.replace(/<!--[\s\S]*?-->/g, '')
				.replace(/\/\*[\s\S]*?\*\//g, '')
				.split('\n');
			lines.forEach((line, i) => {
				const code = line.replace(/\/\/.*$/, '');
				if (JAPANESE.test(code) && !ALLOWED.some((pattern) => pattern.test(code))) {
					found.push(`${file}:${i + 1}: ${line.trim()}`);
				}
			});
		}
		expect(found).toEqual([]);
	});
});
