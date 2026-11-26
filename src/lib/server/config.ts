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
