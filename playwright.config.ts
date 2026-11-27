import { defineConfig } from '@playwright/test';

// E2E はローカルの保存先（PostgreSQL + PostgREST）と LiveKit（docker compose -f compose.dev.yml up -d）を使う。
const port = 4173;
export const e2eEnv = {
	LIVEKIT_URL: 'ws://127.0.0.1:7880',
	LIVEKIT_API_KEY: 'devkey',
	LIVEKIT_API_SECRET: 'secret',
	DB_URL: 'http://127.0.0.1:3399',
	// ローカルの PostgREST 専用の JWT（compose.dev.yml の PGRST_JWT_SECRET で署名）
	POSTGREST_JWT:
		'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoibmFnaV9zcGFjZV9hcGkifQ.XOyByCJks8EaIwpIejNqUAXa789w9CFbLEBG-JdphWQ',
	PUBLIC_ORIGIN: `http://127.0.0.1:${port}`,
	SESSION_SECRET: 'e2e-session-secret-that-is-long-enough-000',
	OAUTH_PRIVATE_KEY_JWK: '',
	// E2E で待てるよう、ホストの待ち時間を短く、入室者とスピーカーの上限を小さくする
	SPACE_HOST_GRACE_SECONDS: '8',
	SPACE_MAX_ENTRANTS: '3',
	SPACE_MAX_SPEAKERS: '2',
	// 偽の AppView（tests/e2e/fixtures/fake-nagi.mjs）
	NAGI_APPVIEW_URL: 'http://127.0.0.1:4999',
	// 自宅の space-agent（E2E では偽の convo とつなぐ）との共有の秘密
	AGENT_SECRET: 'e2e-agent-secret-0123456789abcdef',
	// botたんの3Dモデルと動き。リポジトリに置かないので、あるときだけ E2E_BOT_ASSETS_DIR で渡す
	// （scripts/build-bot-assets.mjs で作ったフォルダ）。無ければ読み込みに失敗してアイコンになる
	BOT_ASSETS_DIR: process.env.E2E_BOT_ASSETS_DIR ?? 'tests/e2e/fixtures/no-bot-assets',
	// 本番用のビルドは .env.production.local も読むので、本番にしか無い値は空で上書きして混ぜない
	BOT_ASSETS_BASE_URL: '',
	R2_ACCOUNT_ID: '',
	R2_ACCESS_KEY_ID: '',
	R2_SECRET_ACCESS_KEY: '',
	R2_BUCKET: '',
	R2_PREFIX: '',
	CF_ACCESS_CLIENT_ID_DB: '',
	CF_ACCESS_CLIENT_SECRET_DB: '',
	SPACE_CREATOR_ALLOWLIST: '',
	DB_SCHEMA: ''
};

/** 偽の convo（tests/e2e/fixtures/fake_convo.py）の URL */
export const FAKE_CONVO_URL = 'http://127.0.0.1:8799';

export default defineConfig({
	globalSetup: './tests/e2e/global-setup.ts',
	webServer: [
		{
			command: 'node tests/e2e/fixtures/fake-nagi.mjs',
			port: 4999,
			reuseExistingServer: false
		},
		{
			command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
			port,
			env: e2eEnv,
			reuseExistingServer: false
		},
		{
			command: 'agent/.venv/bin/python tests/e2e/fixtures/fake_convo.py',
			port: 8799,
			reuseExistingServer: false
		},
		{
			// 本物の space-agent を、偽の convo とつないで動かす（agent/ の README）
			command: 'agent/.venv/bin/python -m space_agent',
			stdout: 'pipe',
			url: 'http://127.0.0.1:8798/health',
			env: {
				PYTHONPATH: 'agent',
				SPACE_API_URL: `http://127.0.0.1:${port}`,
				AGENT_SECRET: 'e2e-agent-secret-0123456789abcdef',
				CONVO_URL: 'http://127.0.0.1:8799',
				CONVO_LOGIN: 'e2e',
				SYNC_INTERVAL_S: '1',
				AGENT_HEALTH_PORT: '8798'
			},
			reuseExistingServer: false
		}
	],
	// botたんの空き状況など保存先の共有の状態を書き換えるテストがあるので、順番に実行する
	workers: 1,
	use: {
		baseURL: `http://127.0.0.1:${port}`,
		// 軽量の headless shell はマイクの取得（getUserMedia）に対応しないので、通常の Chromium を使う
		channel: 'chromium',
		// マイクは偽の装置を使う（許可の画面は出さず、テストごとに許可を与える）
		launchOptions: { args: ['--use-fake-device-for-media-stream'] }
	},
	testMatch: '**/*.e2e.{ts,js}'
});
