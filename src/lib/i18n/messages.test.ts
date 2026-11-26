import { describe, expect, it } from 'vitest';
import { detectLocale } from './messages';

describe('detectLocale', () => {
	it('日本語を最優先にするブラウザは日本語にする', () => {
		expect(detectLocale('ja-JP,ja;q=0.9,en;q=0.8')).toBe('ja');
	});

	it('日本語以外と未指定は英語にする', () => {
		expect(detectLocale('en-US,en;q=0.9,ja;q=0.5')).toBe('en');
		expect(detectLocale('fr-FR')).toBe('en');
		expect(detectLocale(null)).toBe('en');
	});
});
