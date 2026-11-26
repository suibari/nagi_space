import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Redis に置く OAuth トークン等を AES-256-GCM で暗号化する。
 * 鍵は SESSION_SECRET（32文字以上の乱数）の SHA-256。
 */
export class SecretBox {
	readonly #key: Buffer;

	constructor(secret: string) {
		if (secret.length < 32) throw new Error('SESSION_SECRET must be at least 32 characters');
		this.#key = createHash('sha256').update(secret).digest();
	}

	seal(plaintext: string): string {
		const iv = randomBytes(12);
		const cipher = createCipheriv('aes-256-gcm', this.#key, iv);
		const body = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
		return [iv, cipher.getAuthTag(), body].map((part) => part.toString('base64url')).join('.');
	}

	/** 改ざん・別の鍵・形式違いはすべて undefined を返す。 */
	open(sealed: string): string | undefined {
		const parts = sealed.split('.');
		if (parts.length !== 3) return undefined;
		try {
			const [iv, tag, body] = parts.map((part) => Buffer.from(part, 'base64url'));
			const decipher = createDecipheriv('aes-256-gcm', this.#key, iv);
			decipher.setAuthTag(tag);
			return Buffer.concat([decipher.update(body), decipher.final()]).toString('utf8');
		} catch {
			return undefined;
		}
	}
}
