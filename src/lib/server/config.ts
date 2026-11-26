/**
 * 外部サービスの接続先。LiveKit Cloud・自前の LiveKit・ローカルの dev サーバーを
 * この値の差し替えだけで切り替える（design.md D10）。
 */
export type ServiceConfig = {
	livekit: { url: string; apiKey: string; apiSecret: string };
	/** 保存先の PostgREST（design.md D1） */
	db: {
		url: string;
		schema: string;
		jwt?: string;
		cfAccess?: { clientId: string; clientSecret: string };
	};
};

type Env = Record<string, string | undefined>;

const REQUIRED = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'DB_URL'] as const;

export class ConfigError extends Error {
	constructor(public readonly missing: string[]) {
		super(`Missing environment variables: ${missing.join(', ')}`);
		this.name = 'ConfigError';
	}
}

export function loadServiceConfig(env: Env): ServiceConfig {
	const missing = REQUIRED.filter((key) => !env[key]?.trim());
	if (missing.length) throw new ConfigError(missing);
	return {
		livekit: {
			url: env.LIVEKIT_URL!.trim(),
			apiKey: env.LIVEKIT_API_KEY!.trim(),
			apiSecret: env.LIVEKIT_API_SECRET!.trim()
		},
		db: {
			url: env.DB_URL!.trim(),
			schema: env.DB_SCHEMA?.trim() || 'nagi_space',
			jwt: env.POSTGREST_JWT?.trim() || undefined,
			cfAccess:
				env.CF_ACCESS_CLIENT_ID_DB?.trim() && env.CF_ACCESS_CLIENT_SECRET_DB?.trim()
					? {
							clientId: env.CF_ACCESS_CLIENT_ID_DB.trim(),
							clientSecret: env.CF_ACCESS_CLIENT_SECRET_DB.trim()
						}
					: undefined
		}
	};
}

export type AuthConfig = {
	/** OAuth の基準にする正規 origin。ローカルは http://127.0.0.1:<port> */
	origin: string;
	sessionSecret: string;
	/** 本番の confidential client の秘密鍵（ES256 の JWK を JSON 文字列で） */
	privateKeyJwk?: string;
};

export function loadAuthConfig(env: Env): AuthConfig {
	const missing = (['PUBLIC_ORIGIN', 'SESSION_SECRET'] as const).filter((key) => !env[key]?.trim());
	if (missing.length) throw new ConfigError(missing);
	return {
		origin: new URL(env.PUBLIC_ORIGIN!.trim()).origin,
		sessionSecret: env.SESSION_SECRET!.trim(),
		privateKeyJwk: env.OAUTH_PRIVATE_KEY_JWK?.trim() || undefined
	};
}
