import { describe, expect, it } from 'vitest';
import { isUnicodeEmoji, validateChoice } from './reactions';

describe('isUnicodeEmoji', () => {
	it('絵文字1つだけを受け付ける', () => {
		for (const ok of ['🔥', '👍🏽', '👨‍👩‍👧', '🇯🇵', '❤️']) expect(isUnicodeEmoji(ok)).toBe(true);
		for (const ng of ['', 'a', 'こんにちは', '🔥🔥', '🔥 ', 'x'.repeat(40), 1]) {
			expect(isUnicodeEmoji(ng)).toBe(false);
		}
	});
});

describe('validateChoice', () => {
	const emoji = { uri: 'at://a/blue.moji.collection.item/1', name: 'n', url: 'https://x/1' };
	const lookup = async (uri: string) => (uri === emoji.uri ? emoji : undefined);

	it('Unicode 絵文字と、存在するカスタム絵文字を受け付ける', async () => {
		expect(await validateChoice({ kind: 'unicode', emoji: '🎉' }, lookup)).toEqual({
			kind: 'unicode',
			emoji: '🎉'
		});
		// 送られた表示用のURLではなく、AppView の値を使う
		expect(
			await validateChoice(
				{ kind: 'custom', emoji: { uri: emoji.uri, url: 'https://evil/x' } },
				lookup
			)
		).toEqual({ kind: 'custom', emoji });
	});

	it('削除済み・不明なカスタム絵文字と不正な形を拒否する（REACT-02）', async () => {
		expect(
			await validateChoice({ kind: 'custom', emoji: { uri: 'at://gone' } }, lookup)
		).toBeUndefined();
		expect(
			await validateChoice({ kind: 'custom', emoji: { uri: 'https://x' } }, lookup)
		).toBeUndefined();
		expect(await validateChoice({ kind: 'text', emoji: 'hi' }, lookup)).toBeUndefined();
		expect(await validateChoice(undefined, lookup)).toBeUndefined();
	});
});
