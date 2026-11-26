#!/usr/bin/env node
// static/icons/icon.svg から、ファビコンとホーム画面用のアイコン（PNG）を作る（LOOK-03）。
//   node scripts/build-icons.mjs
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const svg = await readFile('static/icons/icon.svg', 'utf8');
const outputs = [
	{ file: 'static/favicon.png', size: 32 },
	{ file: 'static/icons/apple-touch-icon.png', size: 180 },
	{ file: 'static/icons/icon-192.png', size: 192 },
	{ file: 'static/icons/icon-512.png', size: 512 },
	// maskable は丸く切られても欠けないよう、余白を足す
	{ file: 'static/icons/icon-maskable-512.png', size: 512, padding: 0.12 }
];
const browser = await chromium.launch();
const page = await browser.newPage();
for (const { file, size, padding = 0 } of outputs) {
	await page.setViewportSize({ width: size, height: size });
	const inner = Math.round(size * (1 - padding * 2));
	await page.setContent(
		`<body style="margin:0;background:${padding ? '#d8f5f6' : 'transparent'};display:grid;place-items:center;width:${size}px;height:${size}px">` +
			`<div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body>`
	);
	await page.screenshot({ path: file, omitBackground: !padding });
	console.log(file);
}
await browser.close();
