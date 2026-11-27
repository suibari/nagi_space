import { describe, expect, it } from 'vitest';
import {
	contextForSpace,
	fetchHostPosts,
	hostContext,
	pdsUrlOf,
	selectHostPosts
} from './hostPosts';

const now = new Date('2026-11-27T12:00:00Z');
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 3600 * 1000).toISOString();

describe('selectHostPosts', () => {
	it('直近7日の投稿だけを新しい順に残す', () => {
		const posts = selectHostPosts(
			[
				{ text: '3日前', createdAt: daysAgo(3) },
				{ text: '8日前', createdAt: daysAgo(8) },
				{ text: '昨日', createdAt: daysAgo(1) }
			],
			now
		);
		expect(posts.map((p) => p.text)).toEqual(['昨日', '3日前']);
	});

	it('こっそり・CW 付き・ラベル付きは除く', () => {
		const posts = selectHostPosts(
			[
				{ text: 'ふつう', createdAt: daysAgo(1) },
				{ text: 'こっそり', createdAt: daysAgo(1), kossori: true },
				{ text: 'CW', createdAt: daysAgo(1), cwRestricted: true },
				{ text: 'ラベル', createdAt: daysAgo(1), labels: { values: [{ val: 'sexual' }] } }
			],
			now
		);
		expect(posts.map((p) => p.text)).toEqual(['ふつう']);
	});

	it('最大20件、1件200字に切る', () => {
		const many = Array.from({ length: 30 }, (_, i) => ({
			text: 'あ'.repeat(250),
			createdAt: new Date(now.getTime() - i * 60_000).toISOString()
		}));
		const posts = selectHostPosts(many, now);
		expect(posts).toHaveLength(20);
		expect(posts[0].text).toBe(`${'あ'.repeat(200)}…`);
	});
});

describe('pdsUrlOf', () => {
	it('https の PDS だけを使う', () => {
		const doc = (endpoint: string) => ({
			service: [
				{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: endpoint }
			]
		});
		expect(pdsUrlOf(doc('https://pds.test'))?.href).toBe('https://pds.test/');
		expect(pdsUrlOf(doc('http://127.0.0.1:3000'))).toBeUndefined();
		expect(pdsUrlOf({})).toBeUndefined();
	});
});

describe('hostContext', () => {
	it('投稿が無ければ空、あれば日付付きの文にする', () => {
		expect(hostContext('アリス', [], now)).toBe('');
		const text = hostContext(
			'アリス',
			[{ text: '新しいカフェに行った', createdAt: daysAgo(3) }],
			now
		);
		expect(text).toContain('アリスさん');
		expect(text).toContain('- 3日前: 新しいカフェに行った');
		expect(text).toContain('決めつけたりしない');
	});
});

describe('fetchHostPosts', () => {
	const doc = {
		service: [
			{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.test' }
		]
	};

	it('PDS の listRecords から読む', async () => {
		let requested = '';
		const fetchImpl = (async (url: URL) => {
			requested = url.href;
			return new Response(
				JSON.stringify({ records: [{ value: { text: 'こんにちは', createdAt: daysAgo(1) } }] })
			);
		}) as unknown as typeof fetch;
		const posts = await fetchHostPosts('did:plc:alice', async () => doc, fetchImpl, now);
		expect(posts.map((p) => p.text)).toEqual(['こんにちは']);
		expect(requested).toContain('collection=com.suibari.nagi.post');
		expect(requested).toContain('repo=did%3Aplc%3Aalice');
	});

	it('PDS が失敗・解決できないときは空', async () => {
		const failing = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
		expect(await fetchHostPosts('did:plc:alice', async () => doc, failing, now)).toEqual([]);
		const unresolved = async () => {
			throw new Error('nope');
		};
		expect(await fetchHostPosts('did:plc:alice', unresolved, failing, now)).toEqual([]);
	});

	it('遅い PDS は3秒で諦める', async () => {
		const slow = ((_url: URL, init: { signal: AbortSignal }) =>
			new Promise((_resolve, reject) =>
				init.signal.addEventListener('abort', () => reject(new DOMException('', 'TimeoutError')))
			)) as unknown as typeof fetch;
		const started = Date.now();
		expect(await fetchHostPosts('did:plc:alice', async () => doc, slow, now)).toEqual([]);
		expect(Date.now() - started).toBeLessThan(4500);
	}, 8000);
});

describe('contextForSpace', () => {
	const doc = {
		service: [
			{ id: '#atproto_pds', type: 'AtprotoPersonalDataServer', serviceEndpoint: 'https://pds.test' }
		]
	};
	const fetchImpl = (async () =>
		new Response(
			JSON.stringify({
				records: [{ value: { text: '新しいカフェに行った', createdAt: daysAgo(3) } }]
			})
		)) as unknown as typeof fetch;
	const host = { handle: 'alice.test', displayName: 'アリス' };

	it('botたんSpace ではホストの投稿を渡す', async () => {
		const text = await contextForSpace(
			{ kind: 'bot', hostDid: 'did:plc:alice', host },
			async () => doc,
			fetchImpl,
			now
		);
		expect(text).toContain('- 3日前: 新しいカフェに行った');
	});

	it('パブリックSpace では読まずに空を返す', async () => {
		let read = false;
		const text = await contextForSpace(
			{ kind: 'public', hostDid: 'did:plc:alice', host },
			async () => {
				read = true;
				return doc;
			},
			fetchImpl,
			now
		);
		expect(text).toBe('');
		expect(read).toBe(false);
	});
});
