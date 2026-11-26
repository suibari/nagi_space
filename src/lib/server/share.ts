import type { OAuthSession } from '@atproto/oauth-client-node';

export const SHARE_TEXT_MAX_GRAPHEMES = 3000;
const APPVIEW_PROXY = 'did:web:nagi-api.suibari.com#nagi_appview';

const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });

export type ShareTextResult =
	{ ok: true; text: string } | { ok: false; reason: 'empty' | 'tooLong' };

export function validateShareText(raw: unknown): ShareTextResult {
	const text = typeof raw === 'string' ? raw.trim() : '';
	if (!text) return { ok: false, reason: 'empty' };
	if ([...segmenter.segment(text)].length > SHARE_TEXT_MAX_GRAPHEMES) {
		return { ok: false, reason: 'tooLong' };
	}
	return { ok: true, text };
}

export type ShareInput = {
	text: string;
	spaceUrl: string;
	title: string;
	hostName: string;
	locale: 'ja' | 'en';
	now?: Date;
};

/** Nagi の通常投稿（com.suibari.nagi.post）に Space のリンクカードを付ける（LIFE-04）。 */
export function buildSharePost(input: ShareInput) {
	return {
		$type: 'com.suibari.nagi.post',
		text: input.text,
		langs: [input.locale],
		createdAt: (input.now ?? new Date()).toISOString(),
		linkCards: [
			{
				uri: input.spaceUrl,
				title: input.title,
				description:
					input.locale === 'ja' ? `${input.hostName}の Space` : `${input.hostName}'s Space`
			}
		]
	};
}

export class ShareError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ShareError';
	}
}

async function postJson(session: OAuthSession, path: string, body: unknown, headers = {}) {
	const response = await session.fetchHandler(path, {
		method: 'POST',
		headers: { 'content-type': 'application/json', ...headers },
		body: JSON.stringify(body)
	});
	if (!response.ok) {
		const detail = await response.text().catch(() => '');
		throw new ShareError(`${path} failed (${response.status}): ${detail.slice(0, 200)}`);
	}
	return response.json() as Promise<{ uri: string; cid: string }>;
}

/**
 * ホストの PDS に投稿を作り、AppView にすぐ取り込ませる。取り込みの依頼に失敗しても
 * 投稿はできているので成功とする（AppView は後で firehose から取り込む）。
 */
export async function shareToNagi(
	session: OAuthSession,
	record: ReturnType<typeof buildSharePost>
) {
	const created = await postJson(session, '/xrpc/com.atproto.repo.createRecord', {
		repo: session.did,
		collection: 'com.suibari.nagi.post',
		record
	});
	await postJson(
		session,
		'/xrpc/com.suibari.nagi.ensureRecord',
		{ uri: created.uri, cid: created.cid },
		{ 'atproto-proxy': APPVIEW_PROXY }
	).catch((cause) => {
		console.warn('[share] ensureRecord failed', cause instanceof Error ? cause.message : cause);
	});
	return created;
}

/** 失敗したときの再試行用に、ホストが書いた本文を1時間だけ覚えておく（Space の終了でも消す）。 */
export const shareDraftKey = (spaceId: string) => `space:sharedraft:${spaceId}`;
export const SHARE_DRAFT_TTL_SECONDS = 60 * 60;

/** 開始画面の本文の初期値（利用者が編集できる）。 */
export function defaultShareText(title: string, locale: 'ja' | 'en'): string {
	return locale === 'ja' ? `「${title}」の Space を始めました！` : `I started a Space: "${title}"`;
}
