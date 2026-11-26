import type { OAuthSession } from '@atproto/oauth-client-node';
import type { CustomEmoji, EmojiChoice } from '#lib/emoji/types.ts';
import type { KeyValueStore } from './store/types';

const APPVIEW_PROXY = 'did:web:nagi-api.suibari.com#nagi_appview';
const FAVORITES_TTL_SECONDS = 300;

type RawEmojiView = { uri?: unknown; name?: unknown; url?: unknown; alt?: unknown };

function toCustomEmoji(raw: RawEmojiView, appviewUrl: string): CustomEmoji | undefined {
	if (typeof raw.uri !== 'string' || typeof raw.name !== 'string' || typeof raw.url !== 'string') {
		return undefined;
	}
	return {
		uri: raw.uri,
		name: raw.name,
		url: new URL(raw.url, appviewUrl).href,
		...(typeof raw.alt === 'string' && raw.alt ? { alt: raw.alt } : {})
	};
}

/** Nagi で検索できるカスタム絵文字（他の人が登録したものを含む。REACT-02）。認証は要らない。 */
export async function searchCustomEmojis(
	q: string,
	appviewUrl: string,
	fetchImpl: typeof fetch = fetch
): Promise<CustomEmoji[]> {
	const url = new URL('/xrpc/com.suibari.nagi.searchEmojis', appviewUrl);
	url.searchParams.set('q', q);
	url.searchParams.set('limit', '30');
	const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
	if (!response.ok) throw new Error(`searchEmojis failed (${response.status})`);
	const body = (await response.json()) as { emojis?: RawEmojiView[] };
	return (body.emojis ?? [])
		.map((raw) => toCustomEmoji(raw, appviewUrl))
		.filter((emoji): emoji is CustomEmoji => !!emoji);
}

/** カスタム絵文字の1つが、AppView で今も存在し規格に合うか（REACT-02・design.md D4）。 */
export async function getCustomEmoji(
	uri: string,
	appviewUrl: string,
	fetchImpl: typeof fetch = fetch
): Promise<CustomEmoji | undefined> {
	const url = new URL('/xrpc/com.suibari.nagi.getEmoji', appviewUrl);
	url.searchParams.set('uri', uri);
	const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
	if (response.status === 404 || response.status === 400) return undefined;
	if (!response.ok) throw new Error(`getEmoji failed (${response.status})`);
	const body = (await response.json()) as { emoji?: RawEmojiView };
	return body.emoji ? toCustomEmoji(body.emoji, appviewUrl) : undefined;
}

/** Nagi と同期しているお気に入り絵文字（本人の設定）。 */
export async function fetchEmojiFavorites(
	session: OAuthSession,
	appviewUrl: string
): Promise<EmojiChoice[]> {
	const response = await session.fetchHandler('/xrpc/com.suibari.nagi.getPreferences', {
		headers: { 'atproto-proxy': APPVIEW_PROXY }
	});
	if (!response.ok) throw new Error(`getPreferences failed (${response.status})`);
	const body = (await response.json()) as {
		emojiFavorites?: Array<{ kind?: unknown; emoji?: unknown }>;
	};
	const choices: EmojiChoice[] = [];
	for (const favorite of body.emojiFavorites ?? []) {
		if (favorite.kind === 'unicode' && typeof favorite.emoji === 'string') {
			choices.push({ kind: 'unicode', emoji: favorite.emoji });
		} else if (favorite.kind === 'custom' && favorite.emoji && typeof favorite.emoji === 'object') {
			const emoji = toCustomEmoji(favorite.emoji as RawEmojiView, appviewUrl);
			if (emoji) choices.push({ kind: 'custom', emoji });
		}
	}
	return choices;
}

/** お気に入りを本人ごとに5分覚える。取れなければ空にする（選択肢が減るだけで送信はできる）。 */
export function createFavoritesLoader(
	store: KeyValueStore,
	restore: (did: string) => Promise<OAuthSession>,
	appviewUrl: string
) {
	return async (did: string): Promise<EmojiChoice[]> => {
		const key = `nagi:emojifav:${did}`;
		const cached = await store.get(key);
		if (cached) return JSON.parse(cached) as EmojiChoice[];
		try {
			const favorites = await fetchEmojiFavorites(await restore(did), appviewUrl);
			await store.set(key, JSON.stringify(favorites), { ttlSeconds: FAVORITES_TTL_SECONDS });
			return favorites;
		} catch (cause) {
			console.warn(
				'[emoji] could not load favorites',
				cause instanceof Error ? cause.message : cause
			);
			return [];
		}
	};
}
