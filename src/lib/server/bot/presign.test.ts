import { describe, expect, it } from 'vitest';
import { isBotAssetPath, presignBotAsset, presignGetUrl } from './presign';

describe('presignGetUrl', () => {
	it('AWS の文書の例と同じ署名になる', () => {
		// https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
		const url = presignGetUrl({
			host: 'examplebucket.s3.amazonaws.com',
			path: '/test.txt',
			accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
			secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
			region: 'us-east-1',
			datetime: new Date('2013-05-24T00:00:00Z'),
			expiresSeconds: 86400
		});
		expect(new URL(url).searchParams.get('X-Amz-Signature')).toBe(
			'aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404'
		);
	});
});

describe('presignBotAsset', () => {
	const r2 = {
		accountId: 'acc',
		accessKeyId: 'key',
		secretAccessKey: 'secret',
		bucket: 'bucket',
		prefix: 'nagi-space/'
	};

	it('バケットと置き場所を含むパスで署名する', () => {
		const url = new URL(presignBotAsset(r2, 'motions/happy/a.vrma'));
		expect(url.host).toBe('acc.r2.cloudflarestorage.com');
		expect(url.pathname).toBe('/bucket/nagi-space/motions/happy/a.vrma');
		expect(url.searchParams.get('X-Amz-Expires')).toBe('7200');
	});

	it('同じ1時間のうちは同じ URL になる', () => {
		const at = (time: string) => presignBotAsset(r2, 'bot-tan.vrm', new Date(time));
		expect(at('2026-11-27T01:05:00Z')).toBe(at('2026-11-27T01:55:00Z'));
		expect(at('2026-11-27T01:05:00Z')).not.toBe(at('2026-11-27T02:05:00Z'));
	});
});

describe('isBotAssetPath', () => {
	it('決まった形のファイルだけを通す', () => {
		expect(isBotAssetPath('manifest.json')).toBe(true);
		expect(isBotAssetPath('bot-tan.vrm')).toBe(true);
		expect(isBotAssetPath('motions/happy/wave_01.vrma')).toBe(true);
		expect(isBotAssetPath('motions/../secret.vrma')).toBe(false);
		expect(isBotAssetPath('motions/happy/.hidden.vrma')).toBe(false);
		expect(isBotAssetPath('other.vrm')).toBe(false);
		expect(isBotAssetPath('motions/happy/a.vrma/../../x')).toBe(false);
	});
});
