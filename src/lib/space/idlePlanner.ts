/**
 * 待機中のまばたき・表情・しぐさの計画（BOT-12）。描画の毎フレームに時刻を渡すと、
 * その時刻の表情の値と、しぐさを始めるかを返す。乱数と時刻を外から渡せるので単体テストできる。
 */

export const BLINK_GAP_S: [number, number] = [2, 6];
export const BLINK_LENGTH_S = 0.15;
const DOUBLE_BLINK_CHANCE = 0.2;
const DOUBLE_BLINK_GAP_S = 0.25;
export const SMILE_GAP_S: [number, number] = [20, 40];
const SMILE_LENGTH_S = 2.4;
const SMILE_PEAK = 0.6;
export const MOOD_MAX = 0.3;
const MOOD_DRIFT_S = 6;
export const GESTURE_GAP_S: [number, number] = [30, 60];
/** 話している間の表情は控えめにする */
const SPEAKING_SCALE = 0.5;

export type IdleFrame = {
	blink: number;
	happy: number;
	relaxed: number;
	/** この時刻にしぐさを1つ始める */
	gesture: boolean;
};

export type IdleInput = {
	/** 秒 */
	now: number;
	speaking: boolean;
	/** 返事の動きやしぐさを流している間 */
	moving: boolean;
};

export function createIdlePlanner(
	options: { random?: () => number; reducedMotion?: boolean } = {}
) {
	const random = options.random ?? Math.random;
	const between = ([min, max]: [number, number]) => min + random() * (max - min);
	let started: number | undefined;
	let nextBlink = 0;
	let blinkAt = Number.NEGATIVE_INFINITY;
	let secondBlinkAt = Number.NEGATIVE_INFINITY;
	let nextSmile = 0;
	let smileAt = Number.NEGATIVE_INFINITY;
	let nextGesture = 0;
	let moodFrom = { happy: 0.1, relaxed: 0.15 };
	let moodTo = { happy: 0.1, relaxed: 0.15 };
	let moodAt = 0;

	const pulse = (now: number, at: number, length: number) => {
		const t = (now - at) / length;
		return t < 0 || t > 1 ? 0 : Math.sin(Math.PI * t);
	};

	return function step({ now, speaking, moving }: IdleInput): IdleFrame {
		if (started === undefined) {
			started = now;
			nextBlink = now + between(BLINK_GAP_S);
			nextSmile = now + between(SMILE_GAP_S);
			nextGesture = now + between(GESTURE_GAP_S);
			moodAt = now;
		}
		// まばたき（ときどき2回続ける）
		if (now >= nextBlink) {
			blinkAt = now;
			secondBlinkAt =
				random() < DOUBLE_BLINK_CHANCE ? now + DOUBLE_BLINK_GAP_S : Number.NEGATIVE_INFINITY;
			nextBlink = now + between(BLINK_GAP_S);
		}
		const blink = Math.max(
			pulse(now, blinkAt, BLINK_LENGTH_S),
			pulse(now, secondBlinkAt, BLINK_LENGTH_S)
		);

		// 表情はゆっくり次の値へ移り、ときどきほほえむ
		if (now - moodAt >= MOOD_DRIFT_S) {
			moodFrom = moodTo;
			moodTo = { happy: random() * MOOD_MAX, relaxed: random() * MOOD_MAX };
			moodAt = now;
		}
		const k = Math.min(1, (now - moodAt) / MOOD_DRIFT_S);
		const ease = k * k * (3 - 2 * k);
		let happy = moodFrom.happy + (moodTo.happy - moodFrom.happy) * ease;
		let relaxed = moodFrom.relaxed + (moodTo.relaxed - moodFrom.relaxed) * ease;
		if (now >= nextSmile) {
			smileAt = now;
			nextSmile = now + between(SMILE_GAP_S);
		}
		happy = Math.max(happy, SMILE_PEAK * pulse(now, smileAt, SMILE_LENGTH_S));
		if (speaking) {
			happy *= SPEAKING_SCALE;
			relaxed *= SPEAKING_SCALE;
		}

		// しぐさは話していない状態が続いたときだけ。話したり動いたりしたら数え直す
		let gesture = false;
		if (speaking || moving) {
			nextGesture = Math.max(nextGesture, now + between(GESTURE_GAP_S));
		} else if (now >= nextGesture) {
			gesture = !options.reducedMotion;
			nextGesture = now + between(GESTURE_GAP_S);
		}
		return { blink, happy, relaxed, gesture };
	};
}
