import { defineEnvVars } from '@sveltejs/kit/env';

const optional = (value: string | undefined) => value?.trim() || undefined;

/** サーバーだけで使う環境変数。値の説明は .env.example と README を参照。 */
export const variables = defineEnvVars({
	LIVEKIT_URL: { description: 'LiveKit の URL（wss://… / ws://…）' },
	LIVEKIT_API_KEY: { description: 'LiveKit の API キー' },
	LIVEKIT_API_SECRET: { description: 'LiveKit の API シークレット' },
	DB_URL: { description: '保存先の PostgREST の URL（本番は https://db.suibari.com）' },
	DB_SCHEMA: { description: 'PostgREST のスキーマ。省略時は nagi_space', schema: optional },
	POSTGREST_JWT: {
		description: 'role=nagi_space_api の JWT。anon ロールに権限を与えている場合は不要',
		schema: optional
	},
	CF_ACCESS_CLIENT_ID_DB: {
		description: 'Cloudflare Access のサービストークンID',
		schema: optional
	},
	CF_ACCESS_CLIENT_SECRET_DB: {
		description: 'Cloudflare Access のサービストークンのシークレット',
		schema: optional
	},
	PUBLIC_ORIGIN: { description: 'OAuth の基準にする正規 origin' },
	SESSION_SECRET: { description: 'セッションと保存トークンの暗号化に使う32文字以上の乱数' },
	NAGI_APPVIEW_URL: {
		description: 'Nagi AppView の URL。省略時は本番の AppView',
		schema: optional
	},
	NAGI_PASSPORT_ISSUER: {
		description: 'SSOチケットの発行者（Nagi AppView）の origin。省略時は本番の AppView',
		schema: optional
	},
	SPACE_MAX_SPEAKERS: {
		description: 'スピーカーの上限（ホストを含む）。既定 13',
		schema: optional
	},
	SPACE_MAX_ENTRANTS: { description: '入室者の上限。既定 100', schema: optional },
	SPACE_MAX_DURATION_SECONDS: { description: '開催時間の上限（秒）。既定 14400', schema: optional },
	SPACE_HOST_GRACE_SECONDS: {
		description: 'ホストの再接続を待つ時間（秒）。既定 180',
		schema: optional
	},
	SPACE_CREATOR_ALLOWLIST: {
		description:
			'Space を作れる人の DID（カンマ区切り）。空なら誰でも作れる。一般公開前の制限に使う',
		schema: optional
	},
	OAUTH_PRIVATE_KEY_JWK: {
		description: '本番の confidential client の秘密鍵（ES256 の JWK を1行のJSONで）',
		schema: optional
	}
});
