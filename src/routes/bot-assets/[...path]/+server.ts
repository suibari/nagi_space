import { readFile } from 'node:fs/promises';
import { error, json } from '@sveltejs/kit';
import { manifestFromDir, resolveInside } from '#lib/server/bot/assets.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import type { RequestHandler } from './$types';

const TYPES: Record<string, string> = {
	vrm: 'model/gltf-binary',
	vrma: 'model/gltf-binary',
	json: 'application/json'
};

/** 開発用：BOT_ASSETS_DIR のフォルダから botたんの3Dモデルと動きを配る（本番は BOT_ASSETS_BASE_URL）。 */
export const GET: RequestHandler = async ({ params }) => {
	const { botAssetsDir } = await getRuntime();
	if (!botAssetsDir) error(404, 'Not found');
	if (params.path === 'manifest.json') return json(await manifestFromDir(botAssetsDir));
	const file = resolveInside(botAssetsDir, params.path);
	if (!file) error(404, 'Not found');
	const body = await readFile(file).catch(() => undefined);
	if (!body) error(404, 'Not found');
	return new Response(body, {
		headers: {
			'content-type': TYPES[file.split('.').pop() ?? ''] ?? 'application/octet-stream',
			'cache-control': 'public, max-age=3600'
		}
	});
};
