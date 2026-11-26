import type { RedisClientType } from 'redis';
import type { Space } from './model';

const spaceKey = (id: string) => `space:${id}`;
const hostKey = (did: string) => `space:host:${did}`;
const LIVE_PUBLIC = 'space:live:public';
/** 終了後に開催情報を残す期間（design.md D9） */
export const ENDED_RETENTION_SECONDS = 60 * 60 * 24 * 30;

export type CreateResult = { ok: true; space: Space } | { ok: false; activeSpaceId: string };

/** Space の開催情報の保存。音声・字幕・参加者の情報はここに置かない（LIFE-07）。 */
export class SpaceRepository {
	constructor(private readonly redis: RedisClientType) {}

	/** 1人が同時に開催できるのは1つまで（LIFE-01）。ホストの枠を不可分に確保してから保存する。 */
	async create(space: Space): Promise<CreateResult> {
		const claimed = await this.redis.set(hostKey(space.hostDid), space.id, { NX: true });
		if (claimed !== 'OK') {
			const activeSpaceId = await this.redis.get(hostKey(space.hostDid));
			if (activeSpaceId && (await this.getLive(activeSpaceId))) {
				return { ok: false, activeSpaceId };
			}
			// 終わったのに枠が残っていた（途中で失敗した等）ときは取り直す
			await this.redis.set(hostKey(space.hostDid), space.id);
		}
		const multi = this.redis.multi().set(spaceKey(space.id), JSON.stringify(space));
		if (space.kind === 'public')
			multi.zAdd(LIVE_PUBLIC, { score: Date.parse(space.startedAt), value: space.id });
		await multi.exec();
		return { ok: true, space };
	}

	async get(id: string): Promise<Space | undefined> {
		const raw = await this.redis.get(spaceKey(id));
		return raw ? (JSON.parse(raw) as Space) : undefined;
	}

	async getLive(id: string): Promise<Space | undefined> {
		const space = await this.get(id);
		return space && !space.endedAt ? space : undefined;
	}

	async activeSpaceOf(hostDid: string): Promise<Space | undefined> {
		const id = await this.redis.get(hostKey(hostDid));
		return id ? this.getLive(id) : undefined;
	}

	/** 開催中のパブリックSpace（新しい順）。 */
	async listLivePublic(limit = 100): Promise<Space[]> {
		const ids = await this.redis.zRange(LIVE_PUBLIC, 0, limit - 1, { REV: true });
		const spaces = await Promise.all(ids.map((id) => this.getLive(id)));
		return spaces.filter((space): space is Space => !!space);
	}

	/** 終了する。開催情報だけを期限付きで残し、一覧とホストの枠から外す。 */
	async end(id: string, endedAt = new Date()): Promise<Space | undefined> {
		const space = await this.getLive(id);
		if (!space) return undefined;
		const ended: Space = { ...space, endedAt: endedAt.toISOString() };
		await this.redis
			.multi()
			.set(spaceKey(id), JSON.stringify(ended), { EX: ENDED_RETENTION_SECONDS })
			.zRem(LIVE_PUBLIC, id)
			.eval(
				"if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
				{ keys: [hostKey(space.hostDid)], arguments: [id] }
			)
			.exec();
		return ended;
	}
}
