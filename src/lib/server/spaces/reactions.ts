import type { CustomEmoji, EmojiChoice } from '#lib/emoji/types.ts';
import type { KeyValueStore } from '../store/types';

/** リアクションの topic。サーバーだけが送る（利用者はデータを送れない。design.md D3・D4）。 */
export const REACTION_TOPIC = 'nagi-space.reaction';
/** 1人が10秒間に送れる数（REACT-03）。 */
export const REACTION_LIMIT = 8;
export const REACTION_WINDOW_SECONDS = 10;
const EMOJI_CACHE_SECONDS = 600;

export type ReactionMessage = {
	type: 'reaction';
	from: { did: string; name: string; avatar?: string };
	choice: EmojiChoice;
};

const PICTOGRAPH = /\p{Extended_Pictographic}|\p{Regional_Indicator}/u;

/** Unicode 絵文字1つらしい文字列だけを受け付ける（任意の文章を流せないようにする）。 */
export function isUnicodeEmoji(value: unknown): value is string {
	return (
		typeof value === 'string' &&
		value.length > 0 &&
		value.length <= 32 &&
		!/\s/.test(value) &&
		PICTOGRAPH.test(value) &&
		[...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(value)].length === 1
	);
}

/** 送られた選択肢を確かめる。カスタム絵文字は AppView で今も存在するものだけ（REACT-02）。 */
export async function validateChoice(
	raw: unknown,
	lookup: (uri: string) => Promise<CustomEmoji | undefined>
): Promise<EmojiChoice | undefined> {
	const value = (raw ?? {}) as { kind?: unknown; emoji?: unknown };
	if (value.kind === 'unicode')
		return isUnicodeEmoji(value.emoji) ? { kind: 'unicode', emoji: value.emoji } : undefined;
	if (value.kind === 'custom') {
		const uri = (value.emoji as { uri?: unknown } | undefined)?.uri;
		if (typeof uri !== 'string' || !uri.startsWith('at://') || uri.length > 512) return undefined;
		const emoji = await lookup(uri);
		return emoji ? { kind: 'custom', emoji } : undefined;
	}
	return undefined;
}

/** カスタム絵文字の確認結果を10分覚える。 */
export function cachedEmojiLookup(
	store: KeyValueStore,
	fetchEmoji: (uri: string) => Promise<CustomEmoji | undefined>
) {
	return async (uri: string) => {
		const key = `nagi:emoji:${uri}`;
		const cached = await store.get(key);
		if (cached) return cached === 'none' ? undefined : (JSON.parse(cached) as CustomEmoji);
		const emoji = await fetchEmoji(uri);
		await store.set(key, emoji ? JSON.stringify(emoji) : 'none', {
			ttlSeconds: EMOJI_CACHE_SECONDS
		});
		return emoji;
	};
}

/** 連投制限の枠を1つ使う。超えたら false（REACT-03）。 */
export async function takeReactionSlot(store: KeyValueStore, spaceId: string, did: string) {
	const count = await store.incr(`space:reactrate:${spaceId}:${did}`, REACTION_WINDOW_SECONDS);
	return count <= REACTION_LIMIT;
}
