import type { ProfileSummary } from '../nagi';

/** Space の種別。公開範囲の項目は持たない（PART-05、design.md D8）。 */
export type SpaceKind = 'public' | 'bot';

export type Space = {
	id: string;
	kind: SpaceKind;
	hostDid: string;
	/** 作成時点のホストのプロフィール（一覧・未ログインの表示用） */
	host: ProfileSummary;
	title: string;
	startedAt: string;
	endedAt?: string;
};

export const TITLE_MAX_GRAPHEMES = 100;

const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });

export type TitleResult = { ok: true; title: string } | { ok: false; reason: 'empty' | 'tooLong' };

/** タイトルは必須で、空白だけは受け付けない（LIFE-01）。 */
export function validateTitle(raw: unknown): TitleResult {
	const title = typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim() : '';
	if (!title) return { ok: false, reason: 'empty' };
	if ([...segmenter.segment(title)].length > TITLE_MAX_GRAPHEMES) {
		return { ok: false, reason: 'tooLong' };
	}
	return { ok: true, title };
}

export function isSpaceKind(value: unknown): value is SpaceKind {
	return value === 'public' || value === 'bot';
}

const ID_ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

/** URL に載る推測しにくいID（32文字種×12文字 = 60ビット）。 */
export function newSpaceId(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(12));
	return [...bytes].map((byte) => ID_ALPHABET[byte % ID_ALPHABET.length]).join('');
}

export function isSpaceId(value: string): boolean {
	return /^[a-km-np-z2-9]{12}$/.test(value);
}
