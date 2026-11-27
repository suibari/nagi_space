import type { KeyValueStore } from '../store/types';

/** 1件の長さの上限（書記素で数える。COMM-01） */
export const COMMENT_MAX_GRAPHEMES = 30;
/** 1人が10秒間に送れる数（COMM-03）。絵文字の枠とは別に数える */
export const COMMENT_LIMIT = 3;
export const COMMENT_WINDOW_SECONDS = 10;

export type CommentMessage = {
	type: 'comment';
	from: { did: string; name: string; avatar?: string };
	text: string;
};

const graphemes = (value: string) => [
	...new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(value)
];

/**
 * 送られた文面を整えて確かめる（design.md D2）。改行・制御文字・書式文字（ゼロ幅文字や向きを
 * 変える文字）は空白にし、空白をまとめてから数える。通らなければ undefined。
 */
export function normalizeComment(raw: unknown): string | undefined {
	if (typeof raw !== 'string' || raw.length > 1000) return undefined;
	const text = raw
		// 絵文字をつなぐ ZWJ と旗のタグ文字は書式文字でも残す（絵文字が分かれてしまうため）
		.replace(/[\p{Cc}\p{Cf}\u2028\u2029]/gu, (c) =>
			c === '\u200d' || /[\u{E0020}-\u{E007F}]/u.test(c) ? c : ' '
		)
		.replace(/\s+/gu, ' ')
		.trim();
	// 残した ZWJ やタグ文字だけでは見えないので、見える文字を1つは含める
	if (!/[^\s\u200d\u{E0020}-\u{E007F}]/u.test(text)) return undefined;
	const length = graphemes(text).length;
	return length <= COMMENT_MAX_GRAPHEMES ? text : undefined;
}

/** 連投制限の枠を1つ使う。超えたら false（COMM-03）。 */
export async function takeCommentSlot(store: KeyValueStore, spaceId: string, did: string) {
	const count = await store.incr(`space:commentrate:${spaceId}:${did}`, COMMENT_WINDOW_SECONDS);
	return count <= COMMENT_LIMIT;
}
