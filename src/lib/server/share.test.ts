import type { OAuthSession } from '@atproto/oauth-client-node';
import { describe, expect, it } from 'vitest';
import {
	SHARE_TEXT_MAX_GRAPHEMES,
	ShareError,
	buildSharePost,
	shareToNagi,
	validateShareText
} from './share';

const input = {
	text: 'おいでよ',
	spaceUrl: 'https://space.example/s/abcdefghjkmn',
	title: 'みんなで話そう',
	hostName: 'アリス',
	locale: 'ja' as const,
	now: new Date('2026-11-26T12:00:00.000Z')
};

describe('validateShareText', () => {
	it('空と長すぎる本文を拒否する', () => {
		expect(validateShareText('  ')).toEqual({ ok: false, reason: 'empty' });
		expect(validateShareText('あ'.repeat(SHARE_TEXT_MAX_GRAPHEMES + 1))).toEqual({
			ok: false,
			reason: 'tooLong'
		});
		expect(validateShareText(' やあ ')).toEqual({ ok: true, text: 'やあ' });
	});
});

describe('buildSharePost', () => {
	it('Nagi の投稿に Space のリンクカードを付ける', () => {
		expect(buildSharePost(input)).toEqual({
			$type: 'com.suibari.nagi.post',
			text: 'おいでよ',
			langs: ['ja'],
			createdAt: '2026-11-26T12:00:00.000Z',
			linkCards: [
				{
					uri: 'https://space.example/s/abcdefghjkmn',
					title: 'みんなで話そう',
					description: 'アリスの Space'
				}
			]
		});
	});
});

function fakeSession(responses: Record<string, Response>) {
	const calls: Array<{ path: string; headers: Record<string, string>; body: unknown }> = [];
	const session = {
		did: 'did:plc:alice',
		fetchHandler: async (path: string, init: RequestInit) => {
			calls.push({
				path,
				headers: init.headers as Record<string, string>,
				body: JSON.parse(String(init.body))
			});
			return responses[path] ?? new Response('{}', { status: 500 });
		}
	} as unknown as OAuthSession;
	return { session, calls };
}

const ok = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });
const created = { uri: 'at://did:plc:alice/com.suibari.nagi.post/1', cid: 'bafy' };

describe('shareToNagi', () => {
	it('ホストのPDSに投稿を作り、AppViewに取り込みを依頼する', async () => {
		const { session, calls } = fakeSession({
			'/xrpc/com.atproto.repo.createRecord': ok(created),
			'/xrpc/com.suibari.nagi.ensureRecord': ok({ ...created, indexed: true })
		});
		expect(await shareToNagi(session, buildSharePost(input))).toEqual(created);
		expect(calls[0]).toMatchObject({
			path: '/xrpc/com.atproto.repo.createRecord',
			body: { repo: 'did:plc:alice', collection: 'com.suibari.nagi.post' }
		});
		expect(calls[1]).toMatchObject({
			path: '/xrpc/com.suibari.nagi.ensureRecord',
			body: created,
			headers: { 'atproto-proxy': 'did:web:nagi-api.suibari.com#nagi_appview' }
		});
	});

	it('取り込みの依頼に失敗しても投稿は成功とする', async () => {
		const { session } = fakeSession({ '/xrpc/com.atproto.repo.createRecord': ok(created) });
		expect(await shareToNagi(session, buildSharePost(input))).toEqual(created);
	});

	it('投稿の作成に失敗したら ShareError にする', async () => {
		const { session } = fakeSession({});
		await expect(shareToNagi(session, buildSharePost(input))).rejects.toThrow(ShareError);
	});
});
