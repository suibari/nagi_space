import { describe, expect, it } from 'vitest';
import { ADMISSION_REFUSALS, admissionDecision } from './admission';
import type { Space } from './model';

describe('admissionDecision（PART-05）', () => {
	it('入室を断る理由は、退室処分と満員の2つだけ', () => {
		expect(ADMISSION_REFUSALS).toEqual(['banned', 'full']);
	});

	it('どちらにも当たらなければ誰でも入れる', () => {
		expect(admissionDecision({ banned: false, full: false })).toEqual({ ok: true });
		expect(admissionDecision({ banned: true, full: false })).toEqual({
			ok: false,
			reason: 'banned'
		});
		expect(admissionDecision({ banned: false, full: true })).toEqual({ ok: false, reason: 'full' });
	});

	it('Space のデータに公開範囲・招待・パスワードの項目を持たない', () => {
		const keys: Array<keyof Space> = [
			'id',
			'kind',
			'hostDid',
			'host',
			'title',
			'startedAt',
			'endedAt'
		];
		const sample: Required<Space> = {
			id: 'x',
			kind: 'public',
			hostDid: 'did:plc:h',
			host: { did: 'did:plc:h', handle: 'h' },
			title: 't',
			startedAt: '',
			endedAt: ''
		};
		expect(Object.keys(sample).sort()).toEqual([...keys].sort());
	});
});
