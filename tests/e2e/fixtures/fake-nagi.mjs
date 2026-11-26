// E2E 専用の偽の Nagi AppView。SSO チケット発行者の公開鍵（テスト専用の鍵）と、
// 登録確認に使う getProfile だけを返す。
//   DID に "unreg" を含む → 未登録（404）
//   DID に "down" を含む  → AppView の障害（503）
//   それ以外               → 登録済み（joinedAt あり）
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const { publicJwk } = JSON.parse(
	readFileSync(new URL('./passport-keys.json', import.meta.url), 'utf8')
);
const port = Number(process.env.PORT ?? 4999);

function json(res, status, body) {
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
}

createServer((req, res) => {
	const url = new URL(req.url ?? '/', `http://127.0.0.1:${port}`);
	if (url.pathname === '/.well-known/nagi-passport-jwks.json') {
		return json(res, 200, { keys: [publicJwk] });
	}
	if (url.pathname === '/xrpc/com.suibari.nagi.getProfile') {
		const actor = url.searchParams.get('actor') ?? '';
		if (actor.includes('unreg')) return json(res, 404, { error: 'not_found' });
		if (actor.includes('down')) return json(res, 503, { error: 'unavailable' });
		return json(res, 200, {
			profile: {
				did: actor,
				handle: `${actor.slice(-6)}.test`,
				displayName: `テスト${actor.slice(-4)}`,
				joinedAt: '2026-01-01T00:00:00.000Z'
			}
		});
	}
	res.writeHead(404).end();
}).listen(port, '127.0.0.1');
