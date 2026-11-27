import { describe, expect, it } from 'vitest';
import { didHintLogin, isDidHint } from './didHint';

const DID = 'did:plc:abcdefghijklmnopqrstuvwx';

describe('isDidHint', () => {
	it('did:plc と did:web の形だけを受け付ける', () => {
		expect(isDidHint(DID)).toBe(true);
		expect(isDidHint('did:web:example.com')).toBe(true);
		expect(isDidHint('did:plc:short')).toBe(false);
		expect(isDidHint('alice.bsky.social')).toBe(false);
		expect(isDidHint(null)).toBe(false);
	});
});

describe('didHintLogin', () => {
	const login = (href: string) => {
		const to = didHintLogin(new URL(href, 'https://space.example'));
		return to === undefined ? undefined : new URL(to, 'https://space.example');
	};

	it('ヒントをログインへ渡し、戻り先からは did を落とす', () => {
		const to = login(`/s/abc?did=${DID}&x=1`);
		expect(to?.pathname).toBe('/login');
		expect(to?.searchParams.get('did')).toBe(DID);
		expect(to?.searchParams.get('returnTo')).toBe('/s/abc?x=1');
	});

	it('ヒントが無いか形が違えば何もしない', () => {
		expect(login('/s/abc')).toBeUndefined();
		expect(login('/s/abc?did=alice.bsky.social')).toBeUndefined();
	});
});
