import { getRuntime } from '#lib/server/runtime.ts';
import type { PageServerLoad } from './$types';

export type LiveSpaceItem = {
	id: string;
	title: string;
	host: { displayName?: string; handle: string; avatar?: string };
	speakers: number;
	listeners: number;
	botPresent: boolean;
};

/** 開催中のパブリックSpaceの一覧（LIFE-03）。Nagi登録済みの人にだけ出す（ACC-02）。 */
export const load: PageServerLoad = async ({ locals }) => {
	if (locals.nagiUser !== 'registered') return { spaces: [] as LiveSpaceItem[] };
	const { spaces, presence, lifecycle } = await getRuntime();
	// 期限を過ぎた Space はここでも終える（LIFE-06・LIFE-09）
	const live = (
		await Promise.all((await spaces.listLivePublic()).map((space) => lifecycle.enforce(space)))
	).filter((space) => space !== undefined);
	const items = await Promise.all(
		live.map(async (space): Promise<LiveSpaceItem> => {
			const counts = await presence.counts(space.id);
			return {
				id: space.id,
				title: space.title,
				host: {
					displayName: space.host.displayName,
					handle: space.host.handle,
					avatar: space.host.avatar
				},
				speakers: counts.speakers,
				listeners: counts.listeners,
				botPresent: counts.botPresent
			};
		})
	);
	return { spaces: items };
};
