import type { OAuthSession } from '@atproto/oauth-client-node';
import { describe, expect, it } from 'vitest';
import { fetchEmojiFavorites, getCustomEmoji, searchCustomEmojis } from './emoji';

const APPVIEW = 'https://appview.example';
const respond =
	(status: number, body: unknown): typeof fetch =>
	async () =>
		new Response(JSON.stringify(body), { status });

describe('searchCustomEmojis', () => {
	it('カスタム絵文字の一覧を、表示用のURLにして返す', async () => {
		const result = await searchCustomEmojis(
			'ねこ',
			APPVIEW,
			respond(200, {
				emojis: [
					{
						uri: 'at://a/blue.moji.collection.item/1',
						name: 'neko',
						url: '/api/blob/a/1',
						alt: 'ねこ'
					},
					{ name: 'broken' }
				]
			})
		);
		expect(result).toEqual([
			{
				uri: 'at://a/blue.moji.collection.item/1',
				name: 'neko',
				url: 'https://appview.example/api/blob/a/1',
				alt: 'ねこ'
			}
		]);
	});
});

describe('getCustomEmoji', () => {
	it('削除済み・規格外（404・400）は無いものとして扱う', async () => {
		expect(await getCustomEmoji('at://x', APPVIEW, respond(404, {}))).toBeUndefined();
		expect(await getCustomEmoji('at://x', APPVIEW, respond(400, {}))).toBeUndefined();
		await expect(getCustomEmoji('at://x', APPVIEW, respond(502, {}))).rejects.toThrow();
	});
});

describe('fetchEmojiFavorites', () => {
	it('Nagi のお気に入りを、順序を保って選択肢にする', async () => {
		const session = {
			fetchHandler: async () =>
				new Response(
					JSON.stringify({
						emojiFavorites: [
							{ kind: 'unicode', emoji: '🔥' },
							{ kind: 'custom', emoji: { uri: 'at://a/x/1', name: 'n', url: '/b/1' } },
							{ kind: 'unknown' }
						]
					})
				)
		} as unknown as OAuthSession;
		expect(await fetchEmojiFavorites(session, APPVIEW)).toEqual([
			{ kind: 'unicode', emoji: '🔥' },
			{
				kind: 'custom',
				emoji: { uri: 'at://a/x/1', name: 'n', url: 'https://appview.example/b/1' }
			}
		]);
	});
});
