<script lang="ts">
	import './layout.css';
	import { page } from '$app/state';
	import SiteHeader from '#lib/ui/SiteHeader.svelte';
	import type { LayoutProps } from './$types';

	let { children, data }: LayoutProps = $props();

	type Og = { title: string; description: string; image: string; path: string };
	// ページが og を返せばそれを使い、無ければ共通の OGP にする（LOOK-04）
	const og = $derived<Og>(
		(page.data as { og?: Og }).og ?? {
			title: 'Nagi Space',
			// リンクカードを作る側は言語を送らないので、OGP は日本語で書く
			description: 'Nagi のみんなと、声でおしゃべりできる音声チャット',
			image: '/og/default.png',
			path: page.url.pathname
		}
	);
</script>

<svelte:head>
	<link rel="icon" href="/favicon.png" sizes="32x32" type="image/png" />
	<link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
	<link rel="manifest" href="/manifest.webmanifest" />
	<meta property="og:site_name" content="Nagi Space" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content={og.title} />
	<meta property="og:description" content={og.description} />
	<meta property="og:url" content={new URL(og.path, data.origin).href} />
	<meta property="og:image" content={new URL(og.image, data.origin).href} />
	<meta property="og:image:width" content="1200" />
	<meta property="og:image:height" content="630" />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="description" content={og.description} />
</svelte:head>

<SiteHeader locale={data.locale} signedIn={!!data.did} />
{@render children()}
