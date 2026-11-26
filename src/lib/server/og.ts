import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import satori from 'satori';

/**
 * OGP の画像（LOOK-04）。Nagi（nagi_client の api/_ogp.ts）と同じく、画像に載る文字だけを
 * Noto Sans JP からサブセットで取る。取れなければ既定のフォントで描く。
 */
async function loadFont(weight: 400 | 700, text: string) {
	const query = `family=Noto+Sans+JP:wght@${weight}&text=${encodeURIComponent(text)}`;
	const css = await fetch(`https://fonts.googleapis.com/css2?${query}`, {
		// TTF を返させるための古い Safari の UA。satori は WOFF2 を読めない
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1'
		},
		signal: AbortSignal.timeout(5000)
	}).then((response) => response.text());
	const url = /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/.exec(css)?.[1];
	if (!url) throw new Error('font css has no TTF source');
	const font = await fetch(url, { signal: AbortSignal.timeout(5000) });
	if (!font.ok) throw new Error(`font returned ${font.status}`);
	return { name: 'Noto Sans JP', data: await font.arrayBuffer(), weight, style: 'normal' as const };
}

async function loadFonts(text: string) {
	try {
		return await Promise.all([loadFont(400, text), loadFont(700, text)]);
	} catch (cause) {
		console.warn('[og] could not load fonts', cause instanceof Error ? cause.message : cause);
		return undefined;
	}
}

/** Google Fonts に届かないとき用。Noto Sans JP が取れなければ欧文だけでも描く。 */
let fallback: { name: string; data: ArrayBuffer; weight: 400; style: 'normal' } | undefined;
async function fallbackFont() {
	if (!fallback) {
		const response = await fetch(
			'https://fonts.gstatic.com/s/notosans/v36/o-0IIpQlx3QUlC5A4PNb4j5Ba_2c7A.ttf',
			{ signal: AbortSignal.timeout(5000) }
		).catch(() => undefined);
		if (!response?.ok) throw new Error('no font available for OGP');
		fallback = {
			name: 'Noto Sans',
			data: await response.arrayBuffer(),
			weight: 400,
			style: 'normal'
		};
	}
	return fallback;
}

let iconDataUrl: string | undefined;
async function icon(): Promise<string> {
	iconDataUrl ??= `data:image/svg+xml;base64,${(await readFile('static/icons/icon.svg')).toString('base64')}`;
	return iconDataUrl;
}

type Node = { type: string; props: Record<string, unknown> };
const el = (
	type: string,
	style: Record<string, unknown>,
	children?: unknown,
	extra = {}
): Node => ({
	type,
	props: { style, children, ...extra }
});

export type OgSpace = { title: string; hostName: string; live: boolean; locale: 'ja' | 'en' };

/** 共通の画像、またはパブリックSpace のタイトルとホストを入れた画像。 */
export async function renderOg(space?: OgSpace): Promise<Response> {
	const tagline = 'Nagi のみんなと、声でおしゃべり';
	const badge = space
		? space.live
			? space.locale === 'ja'
				? '開催中'
				: 'LIVE'
			: space.locale === 'ja'
				? '終了'
				: 'Ended'
		: '';
	const host = space
		? space.locale === 'ja'
			? `${space.hostName} の Space`
			: `${space.hostName}'s Space`
		: '';
	const text = ['Nagi Space', tagline, space?.title ?? '', host, badge].join('');
	const fonts = await loadFonts(text);
	const root = el(
		'div',
		{
			width: '100%',
			height: '100%',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: 'space-between',
			padding: '64px 72px',
			background: 'linear-gradient(145deg, #eefbfb, #c9f1f2)',
			color: '#2f3542',
			fontFamily: fonts ? 'Noto Sans JP' : undefined
		},
		[
			el('div', { display: 'flex', alignItems: 'center', gap: '20px' }, [
				el('img', { width: '88px', height: '88px' }, undefined, {
					src: await icon(),
					width: 88,
					height: 88
				}),
				el('div', { fontSize: '44px', fontWeight: 700, color: '#007b7e' }, 'Nagi Space')
			]),
			space
				? el('div', { display: 'flex', flexDirection: 'column', gap: '18px' }, [
						badge
							? el(
									'div',
									{
										display: 'flex',
										alignSelf: 'flex-start',
										padding: '6px 20px',
										borderRadius: '999px',
										fontSize: '28px',
										fontWeight: 700,
										background: space.live ? '#00ced1' : '#dbe3e3',
										color: space.live ? '#14383d' : '#747d8c'
									},
									badge
								)
							: el('div', {}, ''),
						el(
							'div',
							{ fontSize: '64px', fontWeight: 700, lineHeight: 1.25, display: 'flex' },
							space.title
						),
						el('div', { fontSize: '34px', color: '#747d8c', display: 'flex' }, host)
					])
				: el('div', { fontSize: '56px', fontWeight: 700, display: 'flex' }, tagline),
			el('div', { fontSize: '26px', color: '#747d8c', display: 'flex' }, space ? tagline : '')
		]
	);
	// フォントを取れなかったときに satori が読める文字を描けるよう、同梱の欧文フォントを足す
	const svg = await satori(root as never, {
		width: 1200,
		height: 630,
		fonts: fonts ?? [await fallbackFont()]
	});
	const png = new Resvg(svg).render().asPng();
	return new Response(new Uint8Array(png), {
		headers: {
			'content-type': 'image/png',
			'cache-control': `public, max-age=${space?.live ? 300 : 3600}`
		}
	});
}
