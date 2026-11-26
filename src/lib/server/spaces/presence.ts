import type { KeyValueStore } from '../store/types';
import type { Role } from './livekit';

/** botたんの参加者ID。space-agent がこのIDで入る（design.md D5）。 */
export const BOT_IDENTITY = 'bot:bot-tan';
/** 字幕用など、画面に出さない space-agent の参加者IDの接頭辞。 */
export const AGENT_IDENTITY_PREFIX = 'agent:';

const presencePrefix = (spaceId: string) => `space:presence:${spaceId}:`;

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
	constructor(private readonly store: KeyValueStore) {}

	async joined(spaceId: string, identity: string, role: Role): Promise<void> {
		if (identity.startsWith(AGENT_IDENTITY_PREFIX)) return;
		await this.store.set(
			presencePrefix(spaceId) + identity,
			identity === BOT_IDENTITY ? 'bot' : role
		);
	}

	async left(spaceId: string, identity: string): Promise<void> {
		await this.store.del(presencePrefix(spaceId) + identity);
	}

	async roleOf(spaceId: string, identity: string): Promise<Role | undefined> {
		const value = await this.store.get(presencePrefix(spaceId) + identity);
		return value === 'host' || value === 'speaker' || value === 'listener' ? value : undefined;
	}

	async counts(spaceId: string): Promise<PresenceCounts> {
		const values = (await this.store.list(presencePrefix(spaceId))).map((row) => row.value);
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
		const rows = await this.store.list(presencePrefix(spaceId));
		await this.store.del(...rows.map((row) => row.key));
	}
}
