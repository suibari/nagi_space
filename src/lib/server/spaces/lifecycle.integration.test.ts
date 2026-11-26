import { describe, expect, it } from 'vitest';
import { loadServiceConfig } from '../config';
import { createStore } from '../services';
import { DEFAULT_LIMITS } from './limits';
import type { SpaceRooms } from './livekit';
import { SpaceLifecycle } from './lifecycle';
import { newSpaceId, type Space } from './model';
import { PresenceStore } from './presence';
import { SpaceRepository } from './repository';

describe.runIf(process.env.INTEGRATION === '1')('SpaceLifecycle', () => {
	const setup = (now: { value: Date }) => {
		const store = createStore(loadServiceConfig(process.env));
		const spaces = new SpaceRepository(store);
		const presence = new PresenceStore(store);
		const deleted: string[] = [];
		const rooms = { deleteRoom: async (id: string) => void deleted.push(id) } as SpaceRooms;
		const lifecycle = new SpaceLifecycle(
			store,
			spaces,
			presence,
			rooms,
			DEFAULT_LIMITS,
			() => now.value
		);
		return { spaces, presence, lifecycle, deleted };
	};
	const makeSpace = (startedAt: Date): Space => {
		const hostDid = `did:plc:life${crypto.randomUUID()}`;
		return {
			id: newSpaceId(),
			kind: 'public',
			hostDid,
			host: { did: hostDid, handle: 'h.test' },
			title: 't',
			startedAt: startedAt.toISOString()
		};
	};

	it('ホストが切断して3分以内に戻れば続き、戻らなければ終える（LIFE-06）', async () => {
		const now = { value: new Date() };
		const { spaces, lifecycle, deleted } = setup(now);
		const space = makeSpace(now.value);
		await spaces.create(space);

		await lifecycle.hostLeft(space.id);
		now.value = new Date(now.value.getTime() + 120_000);
		expect(await lifecycle.getLive(space.id)).toBeTruthy();
		await lifecycle.hostReturned(space.id);
		now.value = new Date(now.value.getTime() + 600_000);
		expect(await lifecycle.getLive(space.id)).toBeTruthy();

		await lifecycle.hostLeft(space.id);
		now.value = new Date(now.value.getTime() + 180_000);
		expect(await lifecycle.getLive(space.id)).toBeUndefined();
		expect(deleted).toEqual([space.id]);
		expect((await spaces.get(space.id))?.endedAt).toBeTruthy();
	});

	it('開始から4時間たったら終える（LIFE-09）', async () => {
		const now = { value: new Date() };
		const { spaces, presence, lifecycle } = setup(now);
		const space = makeSpace(new Date(now.value.getTime() - 4 * 3600_000));
		await spaces.create(space);
		await presence.joined(space.id, space.hostDid, 'host');
		expect(await lifecycle.getLive(space.id)).toBeUndefined();
		expect((await presence.counts(space.id)).total).toBe(0);
	});
});
