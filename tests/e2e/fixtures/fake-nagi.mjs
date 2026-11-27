// E2E 専用の偽の Nagi AppView。SSO チケット発行者の公開鍵（テスト専用の鍵）と、
// 登録確認に使う getProfile と、絵文字の検索・取得を返す。
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
				// "pic" を含む利用者だけアイコンを持つ（LOOK-07 のアイコンと頭文字の確認用）
				...(actor.includes('pic') ? { avatar: 'https://avatar.test/pic.png' } : {}),
				joinedAt: '2026-01-01T00:00:00.000Z'
			}
		});
	}
	// カスタム絵文字（REACT-02）。"neko" を含む検索で1つ返し、その URI だけが存在する
	const neko = {
		uri: 'at://did:plc:emojiowner/blue.moji.collection.item/neko',
		cid: 'bafyneko',
		did: 'did:plc:emojiowner',
		name: 'neko',
		alt: 'ねこ',
		url: '/api/blob/neko.png',
		mediaType: 'image/png'
	};
	if (url.pathname === '/xrpc/com.suibari.nagi.searchEmojis') {
		const q = url.searchParams.get('q') ?? '';
		return json(res, 200, { emojis: q.includes('neko') || q.includes('ねこ') ? [neko] : [] });
	}
	if (url.pathname === '/xrpc/com.suibari.nagi.getEmoji') {
		return url.searchParams.get('uri') === neko.uri
			? json(res, 200, { emoji: neko })
			: json(res, 404, { error: 'not_found' });
	}
	res.writeHead(404).end();
}).listen(port, '127.0.0.1');
