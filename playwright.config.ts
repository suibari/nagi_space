import { defineConfig } from '@playwright/test';

// E2E はローカルの Redis と LiveKit（docker compose -f compose.dev.yml up -d）を使う。
const port = 4173;
export const e2eEnv = {
	LIVEKIT_URL: 'ws://127.0.0.1:7880',
	LIVEKIT_API_KEY: 'devkey',
	LIVEKIT_API_SECRET: 'secret',
	REDIS_URL: 'redis://127.0.0.1:6379',
	PUBLIC_ORIGIN: `http://127.0.0.1:${port}`,
	SESSION_SECRET: 'e2e-session-secret-that-is-long-enough-000',
	OAUTH_PRIVATE_KEY_JWK: ''
};

export default defineConfig({
	webServer: {
		command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
		port,
		env: e2eEnv,
		reuseExistingServer: false
	},
	use: { baseURL: `http://127.0.0.1:${port}` },
	testMatch: '**/*.e2e.{ts,js}'
});
