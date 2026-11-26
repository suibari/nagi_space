import type { OAuthSession } from '@atproto/oauth-client-node';
import type { Space } from './spaces/model';

export const REPORT_REASONS = ['spam', 'harassment', 'sensitive', 'botResponse', 'other'] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];
const COMMENT_MAX = 1000;
const APPVIEW_PROXY = 'did:web:nagi-api.suibari.com#nagi_appview';

export type ReportInput = { reason: ReportReason; comment: string; member?: string };

export function parseReportInput(body: unknown): ReportInput | undefined {
	const value = (body ?? {}) as { reason?: unknown; comment?: unknown; member?: unknown };
	if (!REPORT_REASONS.includes(value.reason as ReportReason)) return undefined;
	const comment = typeof value.comment === 'string' ? value.comment.trim() : '';
	if ([...comment].length > COMMENT_MAX) return undefined;
	const member = typeof value.member === 'string' && value.member ? value.member : undefined;
	return { reason: value.reason as ReportReason, comment, ...(member ? { member } : {}) };
}

/**
 * AppView の createReport に送る内容。音声と字幕は保存していないので含めず、
 * 通報者が書いた理由と Space・対象の識別情報だけにする（PART-07）。
 */
export function buildReportBody(space: Space, spaceUrl: string, input: ReportInput) {
	return {
		subject: {
			space: {
				id: space.id,
				title: space.title,
				url: spaceUrl,
				hostDid: space.hostDid,
				...(input.member ? { member: input.member } : {})
			}
		},
		reason: input.reason,
		...(input.comment ? { comment: input.comment } : {})
	};
}

export class ReportError extends Error {
	constructor(
		readonly status: number,
		message: string
	) {
		super(message);
		this.name = 'ReportError';
	}
}

/** 通報者自身の OAuth セッションで、PDS 経由で AppView に送る。運営にだけ届き、相手には知らせない。 */
export async function sendReport(session: OAuthSession, body: ReturnType<typeof buildReportBody>) {
	const response = await session.fetchHandler('/xrpc/com.suibari.nagi.createReport', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'atproto-proxy': APPVIEW_PROXY },
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		throw new ReportError(
			response.status,
			`createReport failed (${response.status}): ${detail.slice(0, 200)}`
		);
	}
}
