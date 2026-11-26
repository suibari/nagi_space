import type { KeyValueStore } from '../store/types';
import type { Space } from './model';

const spaceKey = (id: string) => `space:${id}`;
const hostKey = (did: string) => `space:host:${did}`;
const liveKey = (id: string) => `space:live:${id}`;
const LIVE_PREFIX = 'space:live:';
/** 終了後に開催情報を残す期間（design.md D9） */
export const ENDED_RETENTION_SECONDS = 60 * 60 * 24 * 30;

export type CreateResult = { ok: true; space: Space } | { ok: false; activeSpaceId: string };

/** Space の開催情報の保存。音声・字幕・参加者の情報はここに置かない（LIFE-07）。 */
export class SpaceRepository {
	constructor(private readonly store: KeyValueStore) {}

	/**
	 * 1人が同時に開催できるのは1つまで（LIFE-01）。開催情報を先に書いてからホストの枠を
	 * 不可分に確保する。先に書くのは、同時に作成したもう一方が「枠の持ち主の Space が無い
	 * （途中で失敗した残り）」と誤って判断し、枠を奪わないようにするため。
	 */
	async create(space: Space): Promise<CreateResult> {
		await this.store.set(spaceKey(space.id), JSON.stringify(space));
		if (!(await this.#claimHost(space))) {
			await this.store.del(spaceKey(space.id));
			return { ok: false, activeSpaceId: (await this.store.get(hostKey(space.hostDid))) ?? '' };
		}
		if (space.kind === 'public') await this.store.set(liveKey(space.id), space.startedAt);
		return { ok: true, space };
	}

	async #claimHost(space: Space): Promise<boolean> {
		const key = hostKey(space.hostDid);
		if (await this.store.set(key, space.id, { ifAbsent: true })) return true;
		const holder = await this.store.get(key);
		if (holder && (await this.getLive(holder))) return false;
		// 終わったのに枠が残っていた（途中で失敗した等）ときは、残っていた値のときだけ取り直す
		if (holder && !(await this.store.delIfEquals(key, holder))) return false;
		return this.store.set(key, space.id, { ifAbsent: true });
	}

	async get(id: string): Promise<Space | undefined> {
		const raw = await this.store.get(spaceKey(id));
		return raw ? (JSON.parse(raw) as Space) : undefined;
	}

	async getLive(id: string): Promise<Space | undefined> {
		const space = await this.get(id);
		return space && !space.endedAt ? space : undefined;
	}

	async activeSpaceOf(hostDid: string): Promise<Space | undefined> {
		const id = await this.store.get(hostKey(hostDid));
		return id ? this.getLive(id) : undefined;
	}

	/** 開催中のパブリックSpace（新しい順）。 */
	async listLivePublic(limit = 100): Promise<Space[]> {
		const rows = await this.store.list(LIVE_PREFIX);
		const ids = rows
			.sort((a, b) => b.value.localeCompare(a.value))
			.slice(0, limit)
			.map((row) => row.key.slice(LIVE_PREFIX.length));
		if (!ids.length) return [];
		const found = await this.store.getMany(ids.map(spaceKey));
		return ids
			.map((id) => found.get(spaceKey(id)))
			.filter((raw): raw is string => !!raw)
			.map((raw) => JSON.parse(raw) as Space)
			.filter((space) => !space.endedAt);
	}

	/** 終了する。開催情報だけを期限付きで残し、一覧とホストの枠から外す。 */
	async end(id: string, endedAt = new Date()): Promise<Space | undefined> {
		const space = await this.getLive(id);
		if (!space) return undefined;
		const ended: Space = { ...space, endedAt: endedAt.toISOString() };
		await this.store.set(spaceKey(id), JSON.stringify(ended), {
			ttlSeconds: ENDED_RETENTION_SECONDS
		});
		await this.store.del(liveKey(id));
		await this.store.delIfEquals(hostKey(space.hostDid), id);
		return ended;
	}
}
