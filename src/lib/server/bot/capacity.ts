import type { RedisClientType } from 'redis';

/** space-agent が数秒ごとに書き込む空き状況（design.md D5）。期限が切れたら使えないとみなす。 */
export const CAPACITY_KEY = 'bot:capacity';

export type BotCapacity = { freeSessions: number; updatedAt: string };

export async function readBotCapacity(redis: RedisClientType): Promise<BotCapacity | undefined> {
	const raw = await redis.get(CAPACITY_KEY);
	return raw ? (JSON.parse(raw) as BotCapacity) : undefined;
}

/** botたんを今招待できるか（BOT-02・LIFE-02）。通知が途絶えていれば招待できない（BOT-06）。 */
export async function isBotAvailable(redis: RedisClientType): Promise<boolean> {
	const capacity = await readBotCapacity(redis);
	return !!capacity && capacity.freeSessions > 0;
}
