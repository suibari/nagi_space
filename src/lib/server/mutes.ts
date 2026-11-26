import type { OAuthSession } from '@atproto/oauth-client-node';
import type { KeyValueStore } from './store/types';

const APPVIEW_PROXY = 'did:web:nagi-api.suibari.com#nagi_appview';
const CACHE_TTL_SECONDS = 300;
export const MUTES_PREFIX = 'nagi:mutes:';

/** 本人がNagiでミュートしているユーザーのDID。本人の OAuth セッションで PDS 経由で取る。 */
export async function fetchMutedDids(session: OAuthSession): Promise<string[]> {
	const response = await session.fetchHandler('/xrpc/com.suibari.nagi.getMutes', {
		headers: { 'atproto-proxy': APPVIEW_PROXY }
	});
	if (!response.ok) throw new Error(`getMutes failed (${response.status})`);
	const body = (await response.json()) as { actors?: Array<{ did?: unknown }> };
	return (body.actors ?? [])
		.map((actor) => actor.did)
		.filter((did): did is string => typeof did === 'string');
}

/**
 * 本人のミュートを5分だけ覚える（PART-09）。ミュートは本人だけの情報なので、本人の表示の絞り込みに
 * だけ使い、他の人には渡さない。取れなかったときは何も隠さない（表示の好みなので、操作は止めない）。
 */
export function createMuteChecker(
	store: KeyValueStore,
	restore: (did: string) => Promise<OAuthSession>
) {
	return async (did: string): Promise<Set<string>> => {
		const key = MUTES_PREFIX + did;
		const cached = await store.get(key);
		if (cached) return new Set(JSON.parse(cached) as string[]);
		try {
			const muted = await fetchMutedDids(await restore(did));
			await store.set(key, JSON.stringify(muted), { ttlSeconds: CACHE_TTL_SECONDS });
			return new Set(muted);
		} catch (cause) {
			console.warn('[mutes] could not load mutes', cause instanceof Error ? cause.message : cause);
			return new Set();
		}
	};
}
