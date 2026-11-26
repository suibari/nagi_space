import { error } from '@sveltejs/kit';
import type { RedisClientType } from 'redis';

export const DEFAULT_NAGI_APPVIEW_URL = 'https://nagi-api.suibari.com';
const CACHE_TTL_SECONDS = 300;

export type Registration = 'registered' | 'unregistered';

/** Space の画面に出すプロフィール。アイコンは AppView の配信URL。 */
export type ProfileSummary = { did: string; handle: string; displayName?: string; avatar?: string };

export type RegistrationResult = { registration: Registration; profile?: ProfileSummary };

export class AppViewUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AppViewUnavailableError';
	}
}

/**
 * Nagi登録済みか（ACC-02）。Nagiプロフィールを作ったか1回以上投稿した人、
 * つまり getProfile の joinedAt がある人を登録済みとする。
 * 通信の失敗は未登録とみなさず AppViewUnavailableError を投げる。
 */
export async function fetchRegistration(
	did: string,
	appviewUrl: string,
	fetchImpl: typeof fetch = fetch
): Promise<RegistrationResult> {
	const url = new URL('/xrpc/com.suibari.nagi.getProfile', appviewUrl);
	url.searchParams.set('actor', did);
	url.searchParams.set('limit', '1');
	let response: Response;
	try {
		response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
	} catch (cause) {
		throw new AppViewUnavailableError(cause instanceof Error ? cause.message : String(cause));
	}
	if (response.status === 404) return { registration: 'unregistered' };
	if (!response.ok) throw new AppViewUnavailableError(`getProfile failed (${response.status})`);
	const body = (await response.json()) as {
		profile?: { joinedAt?: string; handle?: string; displayName?: string; avatar?: string };
	};
	const profile = body.profile;
	if (!profile?.joinedAt) return { registration: 'unregistered' };
	return {
		registration: 'registered',
		profile: {
			did,
			handle: profile.handle ?? did,
			displayName: profile.displayName || undefined,
			avatar: profile.avatar ? new URL(profile.avatar, appviewUrl).href : undefined
		}
	};
}

/** 結果を5分だけ Redis に覚えておく。確認できなかったときは覚えない。 */
export function createRegistrationChecker(
	redis: RedisClientType,
	appviewUrl: string,
	fetchImpl: typeof fetch = fetch
) {
	return async (did: string): Promise<RegistrationResult> => {
		const key = `nagi:registration:${did}`;
		const cached = await redis.get(key);
		if (cached) return JSON.parse(cached) as RegistrationResult;
		const result = await fetchRegistration(did, appviewUrl, fetchImpl);
		await redis.set(key, JSON.stringify(result), { EX: CACHE_TTL_SECONDS });
		return result;
	};
}

export type NagiUserState = 'anonymous' | 'unregistered' | 'unknown' | 'registered';

/**
 * Space の操作（作成・入室・発話・リアクション）の入口で呼ぶガード（ACC-02）。
 * Nagi登録済みでなければ 403、登録を確認できなければ 503 にする。
 */
export function requireNagiUser(locals: App.Locals): string {
	if (!locals.did) error(401, 'Login required');
	if (locals.nagiUser === 'unknown') error(503, 'Could not confirm Nagi registration');
	if (locals.nagiUser !== 'registered') error(403, 'Nagi registration required');
	return locals.did;
}
