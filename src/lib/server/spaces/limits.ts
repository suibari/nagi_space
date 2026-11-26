/** 人数と時間の上限（LIFE-06・LIFE-08・LIFE-09）。すべて設定値で変えられる。 */
export type SpaceLimits = {
	maxSpeakers: number;
	maxEntrants: number;
	maxDurationSeconds: number;
	hostGraceSeconds: number;
};

export const DEFAULT_LIMITS: SpaceLimits = {
	maxSpeakers: 13,
	maxEntrants: 100,
	maxDurationSeconds: 4 * 60 * 60,
	hostGraceSeconds: 3 * 60
};

type Env = Record<string, string | undefined>;

function positiveInt(value: string | undefined, fallback: number, name: string): number {
	if (!value?.trim()) return fallback;
	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0)
		throw new Error(`${name} must be a positive integer`);
	return parsed;
}

export function loadLimits(env: Env): SpaceLimits {
	return {
		maxSpeakers: positiveInt(
			env.SPACE_MAX_SPEAKERS,
			DEFAULT_LIMITS.maxSpeakers,
			'SPACE_MAX_SPEAKERS'
		),
		maxEntrants: positiveInt(
			env.SPACE_MAX_ENTRANTS,
			DEFAULT_LIMITS.maxEntrants,
			'SPACE_MAX_ENTRANTS'
		),
		maxDurationSeconds: positiveInt(
			env.SPACE_MAX_DURATION_SECONDS,
			DEFAULT_LIMITS.maxDurationSeconds,
			'SPACE_MAX_DURATION_SECONDS'
		),
		hostGraceSeconds: positiveInt(
			env.SPACE_HOST_GRACE_SECONDS,
			DEFAULT_LIMITS.hostGraceSeconds,
			'SPACE_HOST_GRACE_SECONDS'
		)
	};
}

export type DeadlineInput = {
	startedAt: string;
	/** ホストが切断した時刻。戻っていれば undefined */
	hostGoneAt?: string;
	now: Date;
	limits: SpaceLimits;
};

/** 今終えるべきか。終えるべきなら理由を返す。 */
export function overdueReason(input: DeadlineInput): 'timeLimit' | 'hostGone' | undefined {
	const now = input.now.getTime();
	if (now >= Date.parse(input.startedAt) + input.limits.maxDurationSeconds * 1000)
		return 'timeLimit';
	if (
		input.hostGoneAt &&
		now >= Date.parse(input.hostGoneAt) + input.limits.hostGraceSeconds * 1000
	) {
		return 'hostGone';
	}
	return undefined;
}

/** 終了したSpaceが時間の上限で終わったか（理由は保存せず、開始と終了の時刻から判断する。LIFE-07）。 */
export function endedByTimeLimit(startedAt: string, endedAt: string, limits: SpaceLimits): boolean {
	return Date.parse(endedAt) - Date.parse(startedAt) >= limits.maxDurationSeconds * 1000 - 1000;
}

/** 入室できるか（LIFE-08）。すでに入っている人の再接続は数え直さない。 */
export function canEnter(
	counts: { total: number },
	alreadyInside: boolean,
	limits: SpaceLimits
): boolean {
	return alreadyInside || counts.total < limits.maxEntrants;
}

/** スピーカーを増やせるか（LIFE-08）。発話の承認・招待（作業5.2）で使う。 */
export function canAddSpeaker(counts: { speakers: number }, limits: SpaceLimits): boolean {
	return counts.speakers < limits.maxSpeakers;
}
