import { readFile } from 'node:fs/promises';
import { error, json } from '@sveltejs/kit';
import { manifestFromDir, resolveInside } from '#lib/server/bot/assets.ts';
import { isBotAssetPath, presignBotAsset } from '#lib/server/bot/presign.ts';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import type { RequestHandler } from './$types';

const TYPES: Record<string, string> = {
	vrm: 'model/gltf-binary',
	vrma: 'model/gltf-binary',
	json: 'application/json'
};

/**
 * botたんの3Dモデルと動き（BOT-05、design.md D7）。本番は非公開の R2 への署名付き URL へ転送し、
 * 開発は BOT_ASSETS_DIR のフォルダから直接配る。
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { botAssetsDir, botAssetsR2 } = await getRuntime();
	if (botAssetsR2) {
		// 署名付き URL を誰にでも配らないよう、Space を開ける利用者に限る
		requireNagiUser(locals);
		if (!isBotAssetPath(params.path)) error(404, 'Not found');
		return new Response(null, {
			status: 302,
			headers: {
				location: presignBotAsset(botAssetsR2, params.path),
				'cache-control': 'private, max-age=1800'
			}
		});
	}
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
