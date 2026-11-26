/** 絵文字の選択肢。カスタム絵文字は AppView の配信URLで表示する。 */
export type CustomEmoji = { uri: string; name: string; url: string; alt?: string };
export type EmojiChoice =
	{ kind: 'unicode'; emoji: string } | { kind: 'custom'; emoji: CustomEmoji };

export function choiceKey(choice: EmojiChoice): string {
	return choice.kind === 'unicode' ? `u:${choice.emoji}` : `c:${choice.emoji.uri}`;
}
