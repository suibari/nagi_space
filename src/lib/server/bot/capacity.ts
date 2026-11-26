import type { KeyValueStore } from '../store/types';

/** space-agent が数秒ごとに書き込む空き状況（design.md D5）。期限が切れたら使えないとみなす。 */
export const CAPACITY_KEY = 'bot:capacity';

export type BotCapacity = { freeSessions: number; updatedAt: string };

export async function readBotCapacity(store: KeyValueStore): Promise<BotCapacity | undefined> {
	const raw = await store.get(CAPACITY_KEY);
	return raw ? (JSON.parse(raw) as BotCapacity) : undefined;
}

/** botたんを今招待できるか（BOT-02・LIFE-02）。通知が途絶えていれば招待できない（BOT-06）。 */
export async function isBotAvailable(store: KeyValueStore): Promise<boolean> {
	const capacity = await readBotCapacity(store);
	return !!capacity && capacity.freeSessions > 0;
}
