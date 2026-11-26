import type { KeyValueStore } from '../store/types';
import { canAddSpeaker, type SpaceLimits } from './limits';
import type { Role, SpaceRooms } from './livekit';
import type { Space } from './model';
import type { PresenceStore } from './presence';

const requestPrefix = (id: string) => `space:req:${id}:`;
const offerKey = (id: string, did: string) => `space:offer:${id}:${did}`;
const roleKey = (id: string, did: string) => `space:role:${id}:${did}`;

export type StageError = 'notListener' | 'noRequest' | 'noOffer' | 'speakersFull' | 'notPresent';
export type StageResult = { ok: true } | { ok: false; error: StageError };
export type Offer = 'approved' | 'invited';

/**
 * 発話のリクエスト・承認・招待とロールの変更（PART-03・PART-04・PART-06）。
 * 承認や招待は「スピーカーになれる」という申し出で、本人がマイクを許可して受け入れたときに
 * スピーカーになる（PART-03：マイクを拒否したら聴衆のまま）。
 */
export class Stage {
	constructor(
		private readonly store: KeyValueStore,
		private readonly rooms: SpaceRooms,
		private readonly presence: PresenceStore,
		private readonly limits: SpaceLimits
	) {}

	/** 入室時のロール。スピーカーの記録があれば再接続後もスピーカーのまま（PART-08）。 */
	async roleOf(space: Space, did: string): Promise<Role> {
		if (space.hostDid === did) return 'host';
		return (await this.store.get(roleKey(space.id, did))) === 'speaker' ? 'speaker' : 'listener';
	}

	async request(space: Space, did: string, name: string): Promise<StageResult> {
		if ((await this.roleOf(space, did)) !== 'listener') return { ok: false, error: 'notListener' };
		await this.store.set(requestPrefix(space.id) + did, name);
		await this.#notifyHost(space);
		return { ok: true };
	}

	async cancel(space: Space, did: string): Promise<StageResult> {
		await this.store.del(requestPrefix(space.id) + did);
		await this.#notifyHost(space);
		return { ok: true };
	}

	async listRequests(space: Space): Promise<Array<{ did: string; name: string }>> {
		const prefix = requestPrefix(space.id);
		return (await this.store.list(prefix)).map((row) => ({
			did: row.key.slice(prefix.length),
			name: row.value
		}));
	}

	async hasRequest(space: Space, did: string): Promise<boolean> {
		return (await this.store.get(requestPrefix(space.id) + did)) !== undefined;
	}

	async offerOf(space: Space, did: string): Promise<Offer | undefined> {
		const value = await this.store.get(offerKey(space.id, did));
		return value === 'approved' || value === 'invited' ? value : undefined;
	}

	/** ホストがリクエストを承認する。スピーカーが上限なら承認できない（LIFE-08）。 */
	async approve(space: Space, target: string): Promise<StageResult> {
		if (!(await this.hasRequest(space, target))) return { ok: false, error: 'noRequest' };
		if (!canAddSpeaker(await this.presence.counts(space.id), this.limits)) {
			return { ok: false, error: 'speakersFull' };
		}
		await this.store.del(requestPrefix(space.id) + target);
		await this.store.set(offerKey(space.id, target), 'approved', { ttlSeconds: 600 });
		await this.rooms.notify(space.id, [target], { type: 'stage.offer', reason: 'approved' });
		await this.#notifyHost(space);
		return { ok: true };
	}

	/** ホストが入室中の聴衆をスピーカーに招待する。 */
	async invite(space: Space, target: string): Promise<StageResult> {
		if ((await this.presence.roleOf(space.id, target)) !== 'listener') {
			return { ok: false, error: 'notPresent' };
		}
		if (!canAddSpeaker(await this.presence.counts(space.id), this.limits)) {
			return { ok: false, error: 'speakersFull' };
		}
		await this.store.set(offerKey(space.id, target), 'invited', { ttlSeconds: 600 });
		await this.rooms.notify(space.id, [target], { type: 'stage.offer', reason: 'invited' });
		return { ok: true };
	}

	/** 本人が申し出を受け入れる（マイクの許可を得たあと）。 */
	async accept(space: Space, did: string): Promise<StageResult> {
		if (!(await this.offerOf(space, did))) return { ok: false, error: 'noOffer' };
		if (!canAddSpeaker(await this.presence.counts(space.id), this.limits)) {
			return { ok: false, error: 'speakersFull' };
		}
		await this.store.del(offerKey(space.id, did));
		await this.setRole(space, did, 'speaker');
		return { ok: true };
	}

	async decline(space: Space, did: string): Promise<StageResult> {
		await this.store.del(offerKey(space.id, did));
		await this.#notifyHost(space);
		return { ok: true };
	}

	/** 聴衆に戻す（本人が戻る：PART-04、ホストが取り消す：PART-06）。 */
	async demote(space: Space, did: string): Promise<StageResult> {
		if (did === space.hostDid) return { ok: false, error: 'notListener' };
		await this.setRole(space, did, 'listener');
		return { ok: true };
	}

	async setRole(space: Space, did: string, role: 'speaker' | 'listener'): Promise<void> {
		if (role === 'speaker') await this.store.set(roleKey(space.id, did), 'speaker');
		else await this.store.del(roleKey(space.id, did));
		await this.rooms.setRole(space.id, did, role);
		await this.presence.joined(space.id, did, role);
		await this.#notifyHost(space);
	}

	/** 退室させた人の申し出や記録を消す。 */
	async forget(space: Space, did: string): Promise<void> {
		await this.store.del(
			requestPrefix(space.id) + did,
			offerKey(space.id, did),
			roleKey(space.id, did)
		);
	}

	/** Space の終了で、発話に関わる記録をすべて消す（LIFE-07）。 */
	async clear(spaceId: string): Promise<void> {
		const rows = [
			...(await this.store.list(requestPrefix(spaceId))),
			...(await this.store.list(`space:offer:${spaceId}:`)),
			...(await this.store.list(`space:role:${spaceId}:`))
		];
		await this.store.del(...rows.map((row) => row.key));
	}

	async #notifyHost(space: Space) {
		await this.rooms
			.notify(space.id, [space.hostDid], { type: 'stage.changed' })
			.catch(() => undefined);
	}
}
