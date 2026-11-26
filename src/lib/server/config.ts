/**
 * 外部サービスの接続先。LiveKit Cloud・自前の LiveKit・ローカルの dev サーバーを
 * この値の差し替えだけで切り替える（design.md D10）。
 */
export type ServiceConfig = {
	livekit: { url: string; apiKey: string; apiSecret: string };
	redisUrl: string;
};

type Env = Record<string, string | undefined>;

const REQUIRED = ['LIVEKIT_URL', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET', 'REDIS_URL'] as const;

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
		redisUrl: env.REDIS_URL!.trim()
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
