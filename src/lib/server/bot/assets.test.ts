import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { manifestFromDir, resolveInside } from './assets';

describe('manifestFromDir', () => {
	it('使うカテゴリの動きを、カテゴリごとに6本まで並べる', async () => {
		const dir = await mkdtemp(join(tmpdir(), 'bot-assets-'));
		for (const category of ['happy', 'idle', 'pat']) {
			await mkdir(join(dir, 'motions', category), { recursive: true });
			for (let i = 0; i < 8; i++) await writeFile(join(dir, 'motions', category, `m${i}.vrma`), '');
		}
		const manifest = await manifestFromDir(dir);
		expect(manifest.model).toBe('bot-tan.vrm');
		expect(manifest.idle).toHaveLength(6);
		expect(manifest.motions.happy).toHaveLength(6);
		expect(manifest.motions.pat).toBeUndefined();
	});
});

describe('resolveInside', () => {
	it('フォルダの中の VRM・VRMA・JSON だけを返す', () => {
		expect(resolveInside('/assets', 'motions/happy/a.vrma')).toBe('/assets/motions/happy/a.vrma');
		expect(resolveInside('/assets', '../etc/passwd')).toBeUndefined();
		expect(resolveInside('/assets', 'motions/../../x.vrm')).toBeUndefined();
		expect(resolveInside('/assets', 'secret.txt')).toBeUndefined();
	});
});
