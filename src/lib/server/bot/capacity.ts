import type { KeyValueStore } from '../store/types';

/** space-agent が数秒ごとに書き込む空き状況（design.md D5）。期限が切れたら使えないとみなす。 */
export const CAPACITY_KEY = 'bot:capacity';

export type BotCapacity = { freeSessions: number; maxSessions?: number; updatedAt: string };

/** available：呼べる／busy：空きが無い（BOT-02）／resting：convo か space-agent に届かない（BOT-06） */
export type BotStatus = 'available' | 'busy' | 'resting';

export async function readBotCapacity(store: KeyValueStore): Promise<BotCapacity | undefined> {
	const raw = await store.get(CAPACITY_KEY);
	return raw ? (JSON.parse(raw) as BotCapacity) : undefined;
}

export async function botStatus(store: KeyValueStore): Promise<BotStatus> {
	const capacity = await readBotCapacity(store);
	// space-agent は convo に届かないとき、セッション数の上限を 0 として知らせてくる
	if (!capacity || capacity.maxSessions === 0) return 'resting';
	return capacity.freeSessions > 0 ? 'available' : 'busy';
}
