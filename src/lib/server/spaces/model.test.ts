import { describe, expect, it } from 'vitest';
import { TITLE_MAX_GRAPHEMES, isSpaceId, newSpaceId, validateTitle } from './model';

describe('validateTitle', () => {
	it('前後と連続する空白を整える', () => {
		expect(validateTitle('  みんなで  おしゃべり ')).toEqual({
			ok: true,
			title: 'みんなで おしゃべり'
		});
	});

	it('空や空白だけのタイトルを拒否する', () => {
		for (const raw of ['', '   ', '\n\t', undefined, 42]) {
			expect(validateTitle(raw)).toEqual({ ok: false, reason: 'empty' });
		}
	});

	it('書記素で数えて上限を超えたら拒否する', () => {
		expect(validateTitle('👨‍👩‍👧'.repeat(TITLE_MAX_GRAPHEMES)).ok).toBe(true);
		expect(validateTitle('あ'.repeat(TITLE_MAX_GRAPHEMES + 1))).toEqual({
			ok: false,
			reason: 'tooLong'
		});
	});
});

describe('newSpaceId', () => {
	it('形式に合うIDを毎回違う値で作る', () => {
		const ids = new Set(Array.from({ length: 100 }, newSpaceId));
		expect(ids.size).toBe(100);
		for (const id of ids) expect(isSpaceId(id)).toBe(true);
		expect(isSpaceId('../etc/passwd')).toBe(false);
	});
});
