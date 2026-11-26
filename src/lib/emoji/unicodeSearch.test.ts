import { describe, expect, it } from 'vitest';
import { normalizeEmojiText, searchUnicodeEmojis, type UnicodeEmoji } from './unicodeSearch';

const item = (emoji: string, label: string, keywords: string[][], order: number): UnicodeEmoji => ({
	emoji,
	label,
	order,
	length: [...emoji].length,
	fields: keywords
});

const index = [
	item('🔥', '炎', [['炎'], ['fire'], ['ほのお', 'fire']], 1),
	item('🐱', '猫の顔', [['猫の顔', 'cat face'], ['cat'], ['ネコ']], 2),
	item('🐈', '猫', [['猫', 'cat'], ['cat2'], ['ネコ']], 3)
];

describe('searchUnicodeEmojis', () => {
	it('1文字の日本語でも引ける', () => {
		expect(searchUnicodeEmojis(index, '炎').map((e) => e.emoji)).toEqual(['🔥']);
	});

	it('英語のキーワードでも引け、完全一致を先にする', () => {
		expect(searchUnicodeEmojis(index, 'cat').map((e) => e.emoji)).toEqual(['🐈', '🐱']);
	});

	it('ひらがなとカタカナを同じに扱う', () => {
		expect(normalizeEmojiText('ねこ')).toBe('ネコ');
	});
});
