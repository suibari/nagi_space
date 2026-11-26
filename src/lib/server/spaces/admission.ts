/**
 * パブリックSpace に入れるか（PART-05）。誰でも入れる場を保つため、断る理由は
 * 退室処分（PART-06）と満員（LIFE-08）の2つだけにする。理由を増やすと、
 * 特定の人だけに閉じた会話になり、電気通信事業法上の扱いが変わりうる（proposal.md）。
 */
export type AdmissionRefusal = 'banned' | 'full';
export const ADMISSION_REFUSALS: readonly AdmissionRefusal[] = ['banned', 'full'];

export function admissionDecision(input: {
	banned: boolean;
	full: boolean;
}): { ok: true } | { ok: false; reason: AdmissionRefusal } {
	if (input.banned) return { ok: false, reason: 'banned' };
	if (input.full) return { ok: false, reason: 'full' };
	return { ok: true };
}
