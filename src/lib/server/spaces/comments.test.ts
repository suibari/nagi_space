import { describe, expect, it } from 'vitest';
import { COMMENT_LIMIT, normalizeComment, takeCommentSlot } from './comments';
import type { KeyValueStore } from '../store/types';

describe('normalizeComment', () => {
	it('30字までを受け付け、31字は拒否する（書記素で数える）', () => {
		expect(normalizeComment('あ'.repeat(30))).toBe('あ'.repeat(30));
		expect(normalizeComment('あ'.repeat(31))).toBeUndefined();
		// 家族の絵文字や肌の色つきの絵文字も1字と数える
		expect(normalizeComment('👨\u200d👩\u200d👧\u200d👦'.repeat(30))).toBe(
			'👨\u200d👩\u200d👧\u200d👦'.repeat(30)
		);
		expect(normalizeComment('👍🏽'.repeat(31))).toBeUndefined();
	});

	it('空白だけと文字列以外は拒否する', () => {
		expect(normalizeComment('   ')).toBeUndefined();
		expect(normalizeComment('\u200b\u200b')).toBeUndefined();
		expect(normalizeComment('\u200d\u200d')).toBeUndefined();
		expect(normalizeComment(42)).toBeUndefined();
		expect(normalizeComment(undefined)).toBeUndefined();
	});

	it('改行・制御文字・書式文字を空白にしてまとめる', () => {
		expect(normalizeComment('  わかる\nそれ\t\tほんとに  ')).toBe('わかる それ ほんとに');
		expect(normalizeComment('a\u200bb\u202ec')).toBe('a b c');
		expect(normalizeComment('x\u0000y')).toBe('x y');
	});

	it('HTMLはそのまま文字として残す（表示は文字として行う）', () => {
		expect(normalizeComment('<b>太字</b>')).toBe('<b>太字</b>');
	});
});

describe('takeCommentSlot', () => {
	it('10秒に3件までで、4件目は拒否する', async () => {
		const counts = new Map<string, number>();
		const store = {
			incr: async (key: string) => {
				counts.set(key, (counts.get(key) ?? 0) + 1);
				return counts.get(key)!;
			}
		} as unknown as KeyValueStore;
		const results = [];
		for (let i = 0; i < COMMENT_LIMIT + 1; i++) {
			results.push(await takeCommentSlot(store, 'space', 'did:plc:a'));
		}
		expect(results).toEqual([true, true, true, false]);
		// 絵文字の枠とは別のキーで数える
		expect([...counts.keys()]).toEqual(['space:commentrate:space:did:plc:a']);
	});
});
