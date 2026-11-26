import { describe, expect, it } from 'vitest';
import {
	DEFAULT_LIMITS,
	canAddSpeaker,
	canEnter,
	endedByTimeLimit,
	loadLimits,
	overdueReason
} from './limits';

const startedAt = '2026-11-26T00:00:00.000Z';
const at = (seconds: number) => new Date(Date.parse(startedAt) + seconds * 1000);

describe('loadLimits', () => {
	it('既定は スピーカー13人・入室者100人・4時間・ホストの待ち3分', () => {
		expect(loadLimits({})).toEqual({
			maxSpeakers: 13,
			maxEntrants: 100,
			maxDurationSeconds: 14400,
			hostGraceSeconds: 180
		});
	});

	it('環境変数で変えられ、不正な値は起動時に拒否する', () => {
		expect(loadLimits({ SPACE_MAX_ENTRANTS: '20' }).maxEntrants).toBe(20);
		expect(() => loadLimits({ SPACE_MAX_ENTRANTS: '0' })).toThrow();
		expect(() => loadLimits({ SPACE_MAX_SPEAKERS: 'x' })).toThrow();
	});
});

describe('overdueReason', () => {
	const limits = DEFAULT_LIMITS;

	it('4時間たったら時間の上限で終える（LIFE-09）', () => {
		expect(overdueReason({ startedAt, now: at(14399), limits })).toBeUndefined();
		expect(overdueReason({ startedAt, now: at(14400), limits })).toBe('timeLimit');
	});

	it('ホストが切断して3分たったら終える。3分以内なら続ける（LIFE-06）', () => {
		const hostGoneAt = at(100).toISOString();
		expect(overdueReason({ startedAt, hostGoneAt, now: at(279), limits })).toBeUndefined();
		expect(overdueReason({ startedAt, hostGoneAt, now: at(280), limits })).toBe('hostGone');
		expect(overdueReason({ startedAt, now: at(1000), limits })).toBeUndefined();
	});
});

describe('endedByTimeLimit', () => {
	it('開始と終了の時刻から、時間の上限で終わったかを判断する', () => {
		expect(endedByTimeLimit(startedAt, at(14400).toISOString(), DEFAULT_LIMITS)).toBe(true);
		expect(endedByTimeLimit(startedAt, at(600).toISOString(), DEFAULT_LIMITS)).toBe(false);
	});
});

describe('canEnter / canAddSpeaker（LIFE-08）', () => {
	it('入室者が上限に達したら新しい人は入れないが、入っている人の再接続は通す', () => {
		expect(canEnter({ total: 99 }, false, DEFAULT_LIMITS)).toBe(true);
		expect(canEnter({ total: 100 }, false, DEFAULT_LIMITS)).toBe(false);
		expect(canEnter({ total: 100 }, true, DEFAULT_LIMITS)).toBe(true);
	});

	it('スピーカーが13人ならそれ以上増やせない', () => {
		expect(canAddSpeaker({ speakers: 12 }, DEFAULT_LIMITS)).toBe(true);
		expect(canAddSpeaker({ speakers: 13 }, DEFAULT_LIMITS)).toBe(false);
	});
});
