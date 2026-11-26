import { describe, expect, it } from 'vitest';
import { loadServiceConfig } from '../config';
import { createStore } from '../services';

// 実際の PostgREST（ローカルは compose.dev.yml）を使う。INTEGRATION=1 のときだけ動かす。
describe.runIf(process.env.INTEGRATION === '1')('PostgrestStore', () => {
	const store = () => createStore(loadServiceConfig(process.env));
	const key = (name: string) => `test:${crypto.randomUUID()}:${name}`;

	it('書き込み・取得・削除ができる', async () => {
		const s = store();
		const k = key('a');
		expect(await s.set(k, 'v1')).toBe(true);
		expect(await s.get(k)).toBe('v1');
		await s.set(k, 'v2');
		expect(await s.get(k)).toBe('v2');
		await s.del(k);
		expect(await s.get(k)).toBeUndefined();
	});

	it('ifAbsent は無いときだけ書く。同時に試しても1つしか通らない', async () => {
		const s = store();
		const k = key('nx');
		const results = await Promise.all(
			Array.from({ length: 5 }, (_, i) => s.set(k, String(i), { ifAbsent: true }))
		);
		expect(results.filter(Boolean)).toHaveLength(1);
		await s.del(k);
	});

	it('期限が切れた値は無いものとして扱い、ifAbsent で取り直せる', async () => {
		const s = store();
		const k = key('ttl');
		await s.set(k, 'old', { ttlSeconds: 0.5 });
		expect(await s.ttl(k)).toBeGreaterThan(0);
		await new Promise((resolve) => setTimeout(resolve, 700));
		expect(await s.get(k)).toBeUndefined();
		expect(await s.ttl(k)).toBe(-1);
		expect(await s.set(k, 'new', { ifAbsent: true })).toBe(true);
		expect(await s.ttl(k)).toBeNull();
		await s.del(k);
	});

	it('取得と同時に期限を延ばせる', async () => {
		const s = store();
		const k = key('touch');
		await s.set(k, 'v', { ttlSeconds: 5 });
		expect(await s.get(k, 600)).toBe('v');
		expect(await s.ttl(k)).toBeGreaterThan(500);
		await s.del(k);
	});

	it('値が一致するときだけ消す', async () => {
		const s = store();
		const k = key('lock');
		await s.set(k, 'mine');
		expect(await s.delIfEquals(k, 'other')).toBe(false);
		expect(await s.get(k)).toBe('mine');
		expect(await s.delIfEquals(k, 'mine')).toBe(true);
	});

	it('複数のキーを1回で取得し、接頭辞で一覧できる（%や_は文字として扱う）', async () => {
		const s = store();
		const base = key('list');
		await s.set(`${base}:1`, 'a');
		await s.set(`${base}:2`, 'b');
		await s.set(`${base}_x`, 'c');
		expect(await s.getMany([`${base}:1`, `${base}:2`, `${base}:none`])).toEqual(
			new Map([
				[`${base}:1`, 'a'],
				[`${base}:2`, 'b']
			])
		);
		expect((await s.list(`${base}:`)).map((row) => row.value)).toEqual(['a', 'b']);
		expect(await s.list(`${base.slice(0, -1)}%`)).toEqual([]);
		await s.del(`${base}:1`, `${base}:2`, `${base}_x`);
	});

	it('期限付きで数え上げ、期限が切れたら1から数え直す', async () => {
		const s = store();
		const k = key('incr');
		expect(await Promise.all([s.incr(k, 0.5), s.incr(k, 0.5), s.incr(k, 0.5)])).toEqual(
			expect.arrayContaining([1, 2, 3])
		);
		await new Promise((resolve) => setTimeout(resolve, 700));
		expect(await s.incr(k, 0.5)).toBe(1);
		await s.del(k);
	});
});
