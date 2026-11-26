// E2E 専用：テスト用の SSO チケット発行者の公開鍵を配る。鍵はテスト専用で、本番とは無関係。
import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';

const { publicJwk } = JSON.parse(
	readFileSync(new URL('./passport-keys.json', import.meta.url), 'utf8')
);
const port = Number(process.env.PORT ?? 4999);

createServer((req, res) => {
	if (req.url === '/.well-known/nagi-passport-jwks.json') {
		res.writeHead(200, { 'content-type': 'application/json' });
		res.end(JSON.stringify({ keys: [publicJwk] }));
		return;
	}
	res.writeHead(404).end();
}).listen(port, '127.0.0.1');
