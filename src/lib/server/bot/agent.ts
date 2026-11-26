import { timingSafeEqual } from 'node:crypto';
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import type { ServiceConfig } from '../config';
import type { Space } from '../spaces/model';
import { BOT_IDENTITY } from '../spaces/presence';
import type { KeyValueStore } from '../store/types';
import { CAPACITY_KEY } from './capacity';

/** 字幕用の space-agent の参加者ID（画面に出さない。design.md D5） */
export const CAPTIONS_IDENTITY = 'agent:captions';
/** space-agent の通知が途絶えたとみなすまでの秒数（BOT-06） */
export const AGENT_STALE_SECONDS = 15;
const TOKEN_TTL_SECONDS = 60 * 60;

const botKey = (spaceId: string) => `space:bot:${spaceId}`;

/** space-agent からの要求か。共有の秘密を比べる（長さの違いでも時間差を出さない）。 */
export function isAgentRequest(header: string | null, secret: string | undefined): boolean {
	if (!secret || !header?.startsWith('Bearer ')) return false;
	const given = Buffer.from(header.slice('Bearer '.length));
	const expected = Buffer.from(secret);
	return given.length === expected.length && timingSafeEqual(given, expected);
}

export type AgentReport = {
	bot: { free: number; max: number };
	captions: { free: number; max: number };
};

export function parseAgentReport(body: unknown): AgentReport | undefined {
	const value = (body ?? {}) as Record<string, { free?: unknown; max?: unknown } | undefined>;
	const pick = (part: { free?: unknown; max?: unknown } | undefined) =>
		part && Number.isInteger(part.free) && Number.isInteger(part.max)
			? { free: Math.max(0, part.free as number), max: Math.max(0, part.max as number) }
			: undefined;
	const bot = pick(value.bot);
	const captions = pick(value.captions);
	return bot && captions ? { bot, captions } : undefined;
}

export type AgentJob = {
	spaceId: string;
	kind: Space['kind'];
	startedAt: string;
	/** botたんに参加してほしいか（BOT-01） */
	bot: boolean;
	captionsToken: string;
	botToken?: string;
};

/** botたんの参加を頼まれているか。 */
export class BotRequests {
	constructor(private readonly store: KeyValueStore) {}

	async request(spaceId: string): Promise<void> {
		await this.store.set(botKey(spaceId), '1', { ttlSeconds: 6 * 3600 });
	}

	async cancel(spaceId: string): Promise<boolean> {
		const had = (await this.store.get(botKey(spaceId))) !== undefined;
		await this.store.del(botKey(spaceId));
		return had;
	}

	async requested(spaceId: string): Promise<boolean> {
		return (await this.store.get(botKey(spaceId))) !== undefined;
	}

	async requestedMany(spaceIds: string[]): Promise<Set<string>> {
		const found = await this.store.getMany(spaceIds.map(botKey));
		return new Set(spaceIds.filter((id) => found.has(botKey(id))));
	}
}

/** space-agent の通知を保存する。botたんの空き（BOT-02）はこの値で決まり、途絶えたら使えないとみなす。 */
export async function recordAgentReport(store: KeyValueStore, report: AgentReport): Promise<void> {
	await store.set(
		CAPACITY_KEY,
		JSON.stringify({
			freeSessions: report.bot.free,
			maxSessions: report.bot.max,
			updatedAt: new Date().toISOString()
		}),
		{ ttlSeconds: AGENT_STALE_SECONDS }
	);
}

/** space-agent の参加者用のトークン。字幕は見えない参加者、botたんは見える参加者として入る。 */
export async function agentToken(
	livekit: ServiceConfig['livekit'],
	spaceId: string,
	who: 'captions' | 'bot'
): Promise<string> {
	const token = new AccessToken(livekit.apiKey, livekit.apiSecret, {
		identity: who === 'captions' ? CAPTIONS_IDENTITY : BOT_IDENTITY,
		name: who === 'captions' ? 'captions' : 'botたん',
		metadata: JSON.stringify({ role: who === 'captions' ? 'agent' : 'bot' }),
		ttl: TOKEN_TTL_SECONDS
	});
	token.addGrant(
		who === 'captions'
			? {
					room: spaceId,
					roomJoin: true,
					hidden: true,
					canSubscribe: true,
					canPublish: false,
					canPublishData: true,
					canUpdateOwnMetadata: false
				}
			: {
					room: spaceId,
					roomJoin: true,
					canSubscribe: false,
					canPublish: true,
					canPublishSources: [TrackSource.MICROPHONE],
					canPublishData: true,
					canUpdateOwnMetadata: false
				}
	);
	return token.toJwt();
}
