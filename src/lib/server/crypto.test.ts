import { describe, expect, it } from 'vitest';
import { SecretBox } from './crypto';

const secret = 'x'.repeat(32);

describe('SecretBox', () => {
	it('暗号化した値を復号できる', () => {
		const box = new SecretBox(secret);
		const sealed = box.seal('{"token":"abc"}');
		expect(sealed).not.toContain('abc');
		expect(box.open(sealed)).toBe('{"token":"abc"}');
	});

	it('同じ値でも毎回違う暗号文になる', () => {
		const box = new SecretBox(secret);
		expect(box.seal('a')).not.toBe(box.seal('a'));
	});

	it('改ざん・別の鍵・壊れた形式を拒否する', () => {
		const box = new SecretBox(secret);
		const sealed = box.seal('value');
		const [iv, tag, body] = sealed.split('.');
		const bytes = Buffer.from(body, 'base64url');
		bytes[0] ^= 0xff;
		expect(box.open(`${iv}.${tag}.${bytes.toString('base64url')}`)).toBeUndefined();
		expect(new SecretBox('y'.repeat(32)).open(sealed)).toBeUndefined();
		expect(box.open('not-sealed')).toBeUndefined();
	});

	it('短すぎる秘密を受け付けない', () => {
		expect(() => new SecretBox('short')).toThrow();
	});
});
