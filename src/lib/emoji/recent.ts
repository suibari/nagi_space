import { choiceKey, type EmojiChoice } from './types';

const KEY = 'nagi-space-emoji-recent';
const MAX = 24;

/** 最近使った絵文字（この端末だけ。保存できない環境では空にする）。 */
export function loadRecent(): EmojiChoice[] {
	try {
		const raw = localStorage.getItem(KEY);
		return raw ? (JSON.parse(raw) as EmojiChoice[]) : [];
	} catch {
		return [];
	}
}

export function pushRecent(choice: EmojiChoice): EmojiChoice[] {
	const next = [
		choice,
		...loadRecent().filter((item) => choiceKey(item) !== choiceKey(choice))
	].slice(0, MAX);
	try {
		localStorage.setItem(KEY, JSON.stringify(next));
	} catch {
		/* 保存できなくても選択はできる */
	}
	return next;
}
