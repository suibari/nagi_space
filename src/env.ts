import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value?.trim() || undefined;

/** サーバーだけで使う環境変数。値の説明は .env.example と README を参照。 */
export const variables = defineEnvVars({
	LIVEKIT_URL: { description: 'LiveKit の URL（wss://… / ws://…）' },
	LIVEKIT_API_KEY: { description: 'LiveKit の API キー' },
	LIVEKIT_API_SECRET: { description: 'LiveKit の API シークレット' },
	REDIS_URL: { description: 'Redis の URL（Upstash は rediss://…）' },
	PUBLIC_ORIGIN: { description: 'OAuth の基準にする正規 origin' },
	SESSION_SECRET: { description: 'セッションと保存トークンの暗号化に使う32文字以上の乱数' },
	NAGI_PASSPORT_ISSUER: {
		description: 'SSOチケットの発行者（Nagi AppView）の origin。省略時は本番の AppView',
		schema: optional
	},
	OAUTH_PRIVATE_KEY_JWK: {
		description: '本番の confidential client の秘密鍵（ES256 の JWK を1行のJSONで）',
		schema: optional
	}
});
