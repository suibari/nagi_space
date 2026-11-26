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
	// E2E で待てるよう、ホストの待ち時間を短く、入室者の上限を小さくする
	SPACE_HOST_GRACE_SECONDS: '8',
	SPACE_MAX_ENTRANTS: '2',
	// 偽の AppView とテスト用の発行者（tests/e2e/fixtures/fake-nagi.mjs）
	NAGI_APPVIEW_URL: 'http://127.0.0.1:4999',
	NAGI_PASSPORT_ISSUER: 'http://127.0.0.1:4999'
};

export default defineConfig({
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
