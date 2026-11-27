import { createHash, createHmac } from 'node:crypto';

/** R2（S3 互換）の読み取り用の鍵。バケットは非公開のまま、署名付き URL で読ませる（design.md D7）。 */
export type R2Config = {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	/** バケットの中の置き場所（例 `nagi-space/`）。空ならバケットの直下 */
	prefix: string;
};

type PresignInput = {
	host: string;
	/** 先頭の `/` を含むパス。各セグメントは呼び出し側でエンコードしない */
	path: string;
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
	datetime: Date;
	expiresSeconds: number;
};

const sha256 = (data: string) => createHash('sha256').update(data).digest('hex');
const hmac = (key: string | Buffer, data: string) =>
	createHmac('sha256', key).update(data).digest();
// RFC 3986 の非予約文字以外をエンコードする（SigV4 の規則。encodeURIComponent は !'()* を残す）
const encode = (value: string) =>
	encodeURIComponent(value).replace(
		/[!'()*]/g,
		(c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
	);

/** AWS SigV4 のクエリ署名で、GET 用の署名付き URL を作る。 */
export function presignGetUrl(input: PresignInput): string {
	const amzDate = input.datetime
		.toISOString()
		.replace(/[-:]/g, '')
		.replace(/\.\d{3}/, '');
	const day = amzDate.slice(0, 8);
	const scope = `${day}/${input.region}/s3/aws4_request`;
	const path = input.path.split('/').map(encode).join('/');
	const query = [
		['X-Amz-Algorithm', 'AWS4-HMAC-SHA256'],
		['X-Amz-Credential', `${input.accessKeyId}/${scope}`],
		['X-Amz-Date', amzDate],
		['X-Amz-Expires', String(input.expiresSeconds)],
		['X-Amz-SignedHeaders', 'host']
	]
		.map(([key, value]) => `${encode(key)}=${encode(value)}`)
		.sort()
		.join('&');
	const canonical = ['GET', path, query, `host:${input.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join(
		'\n'
	);
	const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n');
	let key = hmac(`AWS4${input.secretAccessKey}`, day);
	for (const part of [input.region, 's3', 'aws4_request']) key = hmac(key, part);
	const signature = createHmac('sha256', key).update(toSign).digest('hex');
	return `https://${input.host}${path}?${query}&X-Amz-Signature=${signature}`;
}

const WINDOW_SECONDS = 3600;

/**
 * botたんの3Dモデルと動きの署名付き URL。署名の時刻を1時間単位にそろえ、同じ1時間のうちは
 * 同じ URL にしてブラウザのキャッシュを効かせる。どの時点で発行しても1時間以上は使える。
 */
export function presignBotAsset(r2: R2Config, file: string, now = new Date()): string {
	const start = Math.floor(now.getTime() / 1000 / WINDOW_SECONDS) * WINDOW_SECONDS;
	return presignGetUrl({
		host: `${r2.accountId}.r2.cloudflarestorage.com`,
		path: `/${r2.bucket}/${r2.prefix}${file}`,
		accessKeyId: r2.accessKeyId,
		secretAccessKey: r2.secretAccessKey,
		region: 'auto',
		datetime: new Date(start * 1000),
		expiresSeconds: 2 * WINDOW_SECONDS
	});
}

/** 署名して渡してよいファイルか。置き場の中の決まった形のファイルだけに限る。 */
export function isBotAssetPath(path: string): boolean {
	return /^(manifest\.json|bot-tan\.vrm|motions\/[a-z]+\/[A-Za-z0-9_-][A-Za-z0-9._-]*\.vrma)$/.test(
		path
	);
}
