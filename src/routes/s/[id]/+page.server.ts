import { redirect } from '@sveltejs/kit';
import { didHintLogin } from '#lib/server/didHint.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { endedByTimeLimit } from '#lib/server/spaces/limits.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import { shareDraftKey } from '#lib/server/share.ts';
import { initialRole, visibleTo } from './access.ts';
import { messages, type Locale } from '#lib/i18n/messages.ts';
import type { PageServerLoad } from './$types';

/** botたんSpace は保存した名前ではなく、表示中の言語の決まった名前を出す（LIFE-01） */
const displayTitle = (space: { kind: string; title: string }, locale: Locale) =>
	space.kind === 'bot' ? messages[locale].space.botSpaceTitle : space.title;

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const { spaces, lifecycle, store, mutedBy, botAssetsBase } = await getRuntime();
	const found = visibleTo(
		isSpaceId(params.id) ? await spaces.get(params.id) : undefined,
		locals.did
	);
	if (!found) return { state: 'notFound' as const };
	const space = await lifecycle.enforce(found);
	if (!space) {
		const ended = (await spaces.get(found.id)) ?? found;
		return {
			state: 'ended' as const,
			title: displayTitle(ended, locals.locale),
			og:
				ended.kind === 'public'
					? {
							title: `${ended.title} | Nagi Space`,
							description:
								locals.locale === 'ja' ? 'この Space は終了しました' : 'This Space has ended',
							image: `/og/s/${ended.id}.png`,
							path: `/s/${ended.id}`
						}
					: undefined,
			timeLimit:
				!!ended.endedAt && endedByTimeLimit(ended.startedAt, ended.endedAt, lifecycle.limits)
		};
	}

	// パブリックSpace だけ、タイトルとホストを入れた OGP にする（LOOK-04）
	const og =
		space.kind === 'public'
			? {
					title: `${space.title} | Nagi Space`,
					// リンクカードを作る側は言語を送らないので、OGP は日本語で書く
					description: `${space.host.displayName ?? space.host.handle} の Space`,
					image: `/og/s/${space.id}.png`,
					path: `/s/${space.id}`
				}
			: undefined;
	const summary = {
		id: space.id,
		kind: space.kind,
		title: displayTitle(space, locals.locale),
		startedAt: space.startedAt,
		host: {
			did: space.hostDid,
			displayName: space.host.displayName,
			handle: space.host.handle,
			avatar: space.host.avatar
		}
	};
	// 未ログイン・未登録の閲覧者にはタイトルとホストだけを見せる（ACC-03）
	if (!locals.did) {
		const login = didHintLogin(url);
		if (login) redirect(303, login);
		return { state: 'anonymous' as const, space: summary, og };
	}
	if (locals.nagiUser !== 'registered')
		return { state: 'unregistered' as const, space: summary, og };
	const role = initialRole(space, locals.did);
	// 開始時のシェアに失敗していたら、ホストに再試行を出す（LIFE-04）
	const shareDraft = role === 'host' ? await store.get(shareDraftKey(space.id)) : undefined;
	return {
		state: 'live' as const,
		space: summary,
		og,
		role,
		shareDraft,
		botAssetsBase,
		// 自分がミュートしている人の絵文字を自分の画面で隠すのに使う（PART-09）。本人にだけ返す
		mutedDids: [...(await mutedBy(locals.did))],
		maxDurationSeconds: lifecycle.limits.maxDurationSeconds
	};
};
