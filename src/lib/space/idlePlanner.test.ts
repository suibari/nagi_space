import { describe, expect, it } from 'vitest';
import { BLINK_GAP_S, GESTURE_GAP_S, MOOD_MAX, createIdlePlanner } from './idlePlanner';

/** 決まった列を繰り返す乱数（テストを毎回同じにする） */
function seeded(seed = 1) {
	let x = seed;
	return () => {
		x = (x * 16807) % 2147483647;
		return (x - 1) / 2147483646;
	};
}

function run(
	planner: ReturnType<typeof createIdlePlanner>,
	seconds: number,
	state: (t: number) => { speaking: boolean; moving: boolean } = () => ({
		speaking: false,
		moving: false
	})
) {
	const frames = [];
	for (let t = 0; t <= seconds; t += 1 / 60)
		frames.push({ t, ...planner({ now: t, ...state(t) }) });
	return frames;
}

describe('createIdlePlanner', () => {
	it('まばたきの間隔は2〜6秒（2回続けるときを除く）', () => {
		const frames = run(createIdlePlanner({ random: seeded(7) }), 120);
		const starts: number[] = [];
		frames.forEach((f, i) => {
			if (f.blink > 0 && (i === 0 || frames[i - 1].blink === 0)) starts.push(f.t);
		});
		const gaps = starts
			.slice(1)
			.map((t, i) => t - starts[i])
			.filter((gap) => gap > 0.5);
		expect(gaps.length).toBeGreaterThan(15);
		for (const gap of gaps) {
			expect(gap).toBeGreaterThanOrEqual(BLINK_GAP_S[0] - 0.5);
			expect(gap).toBeLessThanOrEqual(BLINK_GAP_S[1] + 0.05);
		}
	});

	it('しぐさは30〜60秒おきで、話している間は出ない', () => {
		const frames = run(createIdlePlanner({ random: seeded(3) }), 600);
		const times = frames.filter((f) => f.gesture).map((f) => f.t);
		expect(times.length).toBeGreaterThan(8);
		expect(times[0]).toBeGreaterThanOrEqual(GESTURE_GAP_S[0]);
		times.slice(1).forEach((t, i) => {
			expect(t - times[i]).toBeGreaterThanOrEqual(GESTURE_GAP_S[0] - 0.05);
			expect(t - times[i]).toBeLessThanOrEqual(GESTURE_GAP_S[1] + 0.05);
		});

		const speaking = run(createIdlePlanner({ random: seeded(3) }), 600, () => ({
			speaking: true,
			moving: false
		}));
		expect(speaking.some((f) => f.gesture)).toBe(false);
		const moving = run(createIdlePlanner({ random: seeded(3) }), 600, () => ({
			speaking: false,
			moving: true
		}));
		expect(moving.some((f) => f.gesture)).toBe(false);
	});

	it('視差効果を減らす設定ではしぐさを出さず、まばたきは続ける', () => {
		const frames = run(createIdlePlanner({ random: seeded(5), reducedMotion: true }), 300);
		expect(frames.some((f) => f.gesture)).toBe(false);
		expect(frames.some((f) => f.blink > 0.9)).toBe(true);
	});

	it('表情の値は範囲に収まり、ときどきほほえむ。話している間は控えめ', () => {
		const frames = run(createIdlePlanner({ random: seeded(11) }), 200);
		for (const f of frames) {
			expect(f.blink).toBeGreaterThanOrEqual(0);
			expect(f.blink).toBeLessThanOrEqual(1);
			expect(f.relaxed).toBeLessThanOrEqual(MOOD_MAX + 1e-9);
			expect(f.happy).toBeLessThanOrEqual(0.6 + 1e-9);
		}
		expect(Math.max(...frames.map((f) => f.happy))).toBeGreaterThan(0.5);
		const speaking = run(createIdlePlanner({ random: seeded(11) }), 200, () => ({
			speaking: true,
			moving: false
		}));
		expect(Math.max(...speaking.map((f) => f.happy))).toBeLessThanOrEqual(0.3 + 1e-9);
	});
});
