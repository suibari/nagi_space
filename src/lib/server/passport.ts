import type { TicketStore } from '@suibari/nagi-passport';
import { createVerifier, type Verifier, type VerifierOptions } from '@suibari/nagi-passport/verify';
import type { KeyValueStore } from './store/types';

export const DEFAULT_PASSPORT_ISSUER = 'https://nagi-api.suibari.com';

/** チケットの単回使用の記録。「無ければ書く」を不可分に行う。 */
export function createTicketStore(store: KeyValueStore): TicketStore {
	return {
		consume: (jti, ttlSeconds) =>
			store.set(`nagipp:${jti}`, '1', { ifAbsent: true, ttlSeconds: Math.max(1, ttlSeconds) })
	};
}

/**
 * Nagi AppView が発行した SSO チケットの検証器。audience は自分の正規 origin の固定値にする
 * （リクエスト由来の値を使うと他アプリ宛のチケットを受け入れてしまう）。
 */
export function createSsoVerifier(
	options: Pick<VerifierOptions, 'issuer' | 'audience' | 'store'> &
		Partial<Pick<VerifierOptions, 'publicJwks' | 'clockToleranceSec'>>
): Verifier {
	return createVerifier({
		jwksUrl: options.publicJwks
			? undefined
			: `${options.issuer}/.well-known/nagi-passport-jwks.json`,
		...options
	});
}

/** チケットを検証してDIDを返す。無効なら undefined（利用者は通常のログインへ進む）。 */
export async function verifyTicket(
	verifier: Verifier,
	ticket: string
): Promise<string | undefined> {
	try {
		return (await verifier.verify(ticket)).did;
	} catch (cause) {
		console.warn('[sso] ticket rejected', cause instanceof Error ? cause.message : cause);
		return undefined;
	}
}

const DID_PATTERN = /^did:(plc:[a-z2-7]{24}|web:[a-zA-Z0-9.%-]+)$/;

/** 署名の無い ?did= ヒントの形だけを確かめる。認証には使わない。 */
export function isDidHint(value: string | null): value is string {
	return value !== null && DID_PATTERN.test(value);
}
