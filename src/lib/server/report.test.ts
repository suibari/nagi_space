import type { OAuthSession } from '@atproto/oauth-client-node';
import { describe, expect, it } from 'vitest';
import { ReportError, buildReportBody, parseReportInput, sendReport } from './report';
import type { Space } from './spaces/model';

const space: Space = {
	id: 'abcdefghjkmn',
	kind: 'public',
	hostDid: 'did:plc:host',
	host: { did: 'did:plc:host', handle: 'host.test' },
	title: 'みんなで話そう',
	startedAt: '2026-11-26T00:00:00.000Z'
};
const url = 'https://space.example/s/abcdefghjkmn';

describe('parseReportInput', () => {
	it('理由・コメント・対象の参加者を受け取る', () => {
		expect(
			parseReportInput({ reason: 'harassment', comment: ' こわい ', member: 'did:plc:m' })
		).toEqual({
			reason: 'harassment',
			comment: 'こわい',
			member: 'did:plc:m'
		});
		expect(parseReportInput({ reason: 'spam' })).toEqual({ reason: 'spam', comment: '' });
	});

	it('不明な理由と長すぎるコメントは受け付けない', () => {
		expect(parseReportInput({ reason: 'nope' })).toBeUndefined();
		expect(parseReportInput({ reason: 'other', comment: 'あ'.repeat(1001) })).toBeUndefined();
	});
});

describe('buildReportBody', () => {
	it('Space と対象の識別情報と、通報者が書いた理由だけを送る（PART-07）', () => {
		expect(
			buildReportBody(space, url, { reason: 'spam', comment: '宣伝', member: 'did:plc:m' })
		).toEqual({
			subject: {
				space: {
					id: space.id,
					title: space.title,
					url,
					hostDid: 'did:plc:host',
					member: 'did:plc:m'
				}
			},
			reason: 'spam',
			comment: '宣伝'
		});
		expect(buildReportBody(space, url, { reason: 'other', comment: '' })).toEqual({
			subject: { space: { id: space.id, title: space.title, url, hostDid: 'did:plc:host' } },
			reason: 'other'
		});
	});
});

describe('sendReport', () => {
	it('PDS 経由で AppView の createReport を呼ぶ', async () => {
		let called: { path: string; headers: Record<string, string> } | undefined;
		const session = {
			fetchHandler: async (path: string, init: RequestInit) => {
				called = { path, headers: init.headers as Record<string, string> };
				return new Response('{}', { status: 200 });
			}
		} as unknown as OAuthSession;
		await sendReport(session, buildReportBody(space, url, { reason: 'spam', comment: '' }));
		expect(called).toMatchObject({
			path: '/xrpc/com.suibari.nagi.createReport',
			headers: { 'atproto-proxy': 'did:web:nagi-api.suibari.com#nagi_appview' }
		});
	});

	it('失敗したら状態を持った ReportError にする', async () => {
		const session = {
			fetchHandler: async () => new Response('{}', { status: 429 })
		} as unknown as OAuthSession;
		await expect(
			sendReport(session, buildReportBody(space, url, { reason: 'spam', comment: '' }))
		).rejects.toMatchObject({ status: 429, name: 'ReportError' } satisfies Partial<ReportError>);
	});
});
