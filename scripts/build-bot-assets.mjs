#!/usr/bin/env node
// botたんの3Dモデルと動きを、置き場（BOT_ASSETS_BASE_URL）に置く形にまとめる（design.md D7）。
//   node scripts/build-bot-assets.mjs <bot-tan-convo のフォルダ> <出力先>
// 出力: bot-tan.vrm, motions/<カテゴリ>/*.vrma（6本まで）, manifest.json
// 置き場は、Nagi Space の origin から読めるよう CORS を許可しておく。
import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const PER = 6;
const CATEGORIES = [
	'idle',
	'neutral',
	'happy',
	'greeting',
	'encouraging',
	'surprised',
	'thinking',
	'dance'
];
const [convo, out] = process.argv.slice(2);
if (!convo || !out) {
	console.error('使い方: node scripts/build-bot-assets.mjs <bot-tan-convo のフォルダ> <出力先>');
	process.exit(1);
}
await mkdir(out, { recursive: true });
await copyFile(join(convo, 'assets', 'bot-tan.vrm'), join(out, 'bot-tan.vrm'));
const manifest = { model: 'bot-tan.vrm', idle: [], motions: {} };
for (const category of CATEGORIES) {
	const files = (await readdir(join(convo, 'data', 'motions', category)).catch(() => []))
		.filter((file) => file.endsWith('.vrma'))
		.sort()
		.slice(0, PER);
	if (!files.length) continue;
	await mkdir(join(out, 'motions', category), { recursive: true });
	const paths = [];
	for (const file of files) {
		await copyFile(
			join(convo, 'data', 'motions', category, file),
			join(out, 'motions', category, file)
		);
		paths.push(`motions/${category}/${file}`);
	}
	if (category === 'idle') manifest.idle = paths;
	else manifest.motions[category] = paths;
}
await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, '\t') + '\n');
console.log(`まとめた: ${out}`);
