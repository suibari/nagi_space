import type { KeyValueStore } from '../store/types';
import { overdueReason, type SpaceLimits } from './limits';
import type { SpaceRooms } from './livekit';
import type { Space } from './model';
import type { PresenceStore } from './presence';
import type { SpaceRepository } from './repository';
import type { Stage } from './stage';

const hostGoneKey = (id: string) => `space:hostgone:${id}`;
const shareDraftKey = (id: string) => `space:sharedraft:${id}`;
const botKey = (id: string) => `space:bot:${id}`;

/**
 * Space の終了と期限の確認。常駐するタイマーが無いので（Vercel）、Space に触れる処理
 * （一覧・画面・トークン・状態の確認・Webhook）のたびに期限を確かめ、過ぎていれば終える
 * （LIFE-06・LIFE-09、design.md D11）。
 */
export class SpaceLifecycle {
	constructor(
		private readonly store: KeyValueStore,
		private readonly spaces: SpaceRepository,
		private readonly presence: PresenceStore,
		private readonly rooms: SpaceRooms,
		readonly limits: SpaceLimits,
		private readonly stage?: Pick<Stage, 'clear'>,
		private readonly now: () => Date = () => new Date()
	) {}

	/** 終了する。room を消して全員の接続を切り、開催情報だけを残す（LIFE-05・LIFE-07）。 */
	async end(id: string): Promise<Space | undefined> {
		const ended = await this.spaces.end(id, this.now());
		await this.presence.clear(id);
		await this.stage?.clear(id);
		await this.store.del(hostGoneKey(id), shareDraftKey(id), botKey(id));
		await this.rooms.deleteRoom(id);
		return ended;
	}

	/** 期限を過ぎていれば終える。開催中なら Space を、終わっていれば undefined を返す。 */
	async enforce(space: Space): Promise<Space | undefined> {
		if (space.endedAt) return undefined;
		const hostGoneAt = await this.store.get(hostGoneKey(space.id));
		const reason = overdueReason({
			startedAt: space.startedAt,
			hostGoneAt,
			now: this.now(),
			limits: this.limits
		});
		if (!reason) return space;
		await this.end(space.id);
		return undefined;
	}

	async getLive(id: string): Promise<Space | undefined> {
		const space = await this.spaces.getLive(id);
		return space ? this.enforce(space) : undefined;
	}

	/** ホストが切断した。戻らなければ待ち時間のあとで終える（LIFE-06）。 */
	async hostLeft(id: string): Promise<void> {
		await this.store.set(hostGoneKey(id), this.now().toISOString(), {
			ifAbsent: true,
			ttlSeconds: this.limits.hostGraceSeconds + 3600
		});
	}

	async hostReturned(id: string): Promise<void> {
		await this.store.del(hostGoneKey(id));
	}

	async isHostAway(id: string): Promise<boolean> {
		return (await this.store.get(hostGoneKey(id))) !== undefined;
	}
}
