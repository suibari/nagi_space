import { readdir } from 'node:fs/promises';
import { join, normalize, relative, sep } from 'node:path';

/**
 * botたんの3Dモデルと動き（BOT-05、design.md D7）。大きく公開リポジトリに置かないため、
 * 本番は外部の置き場（BOT_ASSETS_BASE_URL）から、開発はローカルのフォルダ（BOT_ASSETS_DIR）から読む。
 */
export type BotManifest = {
	model: string;
	/** 待機の動き（VRMA）。順に繰り返す */
	idle: string[];
	/** 返事の動きのカテゴリ（convo の motion イベントの category）ごとの VRMA */
	motions: Record<string, string[]>;
};

export const MODEL_FILE = 'bot-tan.vrm';
export const MOTIONS_PER_CATEGORY = 6;
/** convo の作り置きの動きのうち、Space で使うカテゴリ（pat・custom は展示や頼まれた動き用なので使わない） */
export const MOTION_CATEGORIES = [
	'neutral',
	'happy',
	'greeting',
	'encouraging',
	'surprised',
	'thinking',
	'dance'
] as const;

/** フォルダから動きの一覧を作る（BOT_ASSETS_DIR の構成は scripts/build-bot-assets.mjs と同じ）。 */
export async function manifestFromDir(dir: string): Promise<BotManifest> {
	const list = async (category: string) => {
		const files = await readdir(join(dir, 'motions', category)).catch(() => [] as string[]);
		return files
			.filter((file) => file.endsWith('.vrma'))
			.sort()
			.slice(0, MOTIONS_PER_CATEGORY)
			.map((file) => `motions/${category}/${file}`);
	};
	const motions: Record<string, string[]> = {};
	for (const category of MOTION_CATEGORIES) {
		const files = await list(category);
		if (files.length) motions[category] = files;
	}
	return { model: MODEL_FILE, idle: await list('idle'), motions };
}

/** 配信してよいフォルダの中のファイルか（../ などで外へ出ないか）。 */
export function resolveInside(dir: string, path: string): string | undefined {
	const target = normalize(join(dir, path));
	const rel = relative(dir, target);
	if (!rel || rel.startsWith('..') || rel.split(sep).includes('..')) return undefined;
	return /\.(vrm|vrma|json)$/.test(target) ? target : undefined;
}
