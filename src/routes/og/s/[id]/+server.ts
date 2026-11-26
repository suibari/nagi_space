import { renderOg } from '#lib/server/og.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import type { RequestHandler } from './$types';

/**
 * Space の OGP 画像（LOOK-04）。パブリックSpace だけタイトルとホストを入れ、botたんSpace と
 * 存在しない Space は、Space 固有の情報を含まない共通の画像にする。
 */
export const GET: RequestHandler = async ({ params }) => {
	const id = params.id.replace(/\.png$/, '');
	const { spaces } = await getRuntime();
	const space = isSpaceId(id) ? await spaces.get(id) : undefined;
	if (!space || space.kind !== 'public') return renderOg();
	return renderOg({
		title: space.title,
		hostName: space.host.displayName ?? space.host.handle,
		live: !space.endedAt,
		// リンクカードを作る側（Nagi など）は言語を送らないので、Nagi の主な言語の日本語で描く
		locale: 'ja'
	});
};
