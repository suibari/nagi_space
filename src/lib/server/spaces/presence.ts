import type { RedisClientType } from 'redis';
import type { Role } from './livekit';

/** botたんの参加者ID。space-agent がこのIDで入る（design.md D5）。 */
export const BOT_IDENTITY = 'bot:bot-tan';
/** 字幕用など、画面に出さない space-agent の参加者IDの接頭辞。 */
export const AGENT_IDENTITY_PREFIX = 'agent:';

const presenceKey = (spaceId: string) => `space:presence:${spaceId}`;

export type PresenceCounts = {
	speakers: number;
	listeners: number;
	total: number;
	botPresent: boolean;
};

export function parseRole(metadata: string | undefined): Role {
	try {
		const role = JSON.parse(metadata ?? '{}').role;
		return role === 'host' || role === 'speaker' ? role : 'listener';
	} catch {
		return 'listener';
	}
}

/**
 * いま入室している人とロール。一覧の人数（LIFE-03）と上限（LIFE-08）に使う。
 * Space の終了とともに消す（LIFE-07）。
 */
export class PresenceStore {
	constructor(private readonly redis: RedisClientType) {}

	async joined(spaceId: string, identity: string, role: Role): Promise<void> {
		if (identity.startsWith(AGENT_IDENTITY_PREFIX)) return;
		await this.redis.hSet(presenceKey(spaceId), identity, identity === BOT_IDENTITY ? 'bot' : role);
	}

	async left(spaceId: string, identity: string): Promise<void> {
		await this.redis.hDel(presenceKey(spaceId), identity);
	}

	async roleOf(spaceId: string, identity: string): Promise<Role | undefined> {
		const value = await this.redis.hGet(presenceKey(spaceId), identity);
		return value === 'host' || value === 'speaker' || value === 'listener' ? value : undefined;
	}

	async counts(spaceId: string): Promise<PresenceCounts> {
		const values = Object.values(await this.redis.hGetAll(presenceKey(spaceId)));
		const humans = values.filter((value) => value !== 'bot');
		const speakers = humans.filter((value) => value === 'host' || value === 'speaker').length;
		return {
			speakers,
			listeners: humans.length - speakers,
			total: humans.length,
			botPresent: values.includes('bot')
		};
	}

	async clear(spaceId: string): Promise<void> {
		await this.redis.del(presenceKey(spaceId));
	}
}
