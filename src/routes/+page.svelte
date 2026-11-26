<script lang="ts">
	import { messages } from '#lib/i18n/messages.ts';
	import type { PageProps } from './$types';

	const NAGI_URL = 'https://nagi.suibari.com/';

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale]);
</script>

<svelte:head>
	<title>Nagi Space</title>
</svelte:head>

<main class="mx-auto max-w-xl px-4 py-12">
	<h1 class="text-2xl font-bold">Nagi Space</h1>
	{#if data.did}
		{#if data.nagiUser === 'unregistered'}
			<section class="mt-4" data-testid="unregistered">
				<p>{t.home.unregistered}</p>
				<a href={NAGI_URL} class="mt-2 inline-block underline">{t.home.openNagi}</a>
			</section>
		{:else if data.nagiUser === 'unknown'}
			<section class="mt-4" role="alert" data-testid="registration-unknown">
				<p>{t.home.unknown}</p>
				<button type="button" class="mt-2 underline" onclick={() => location.reload()}>
					{t.home.reload}
				</button>
			</section>
		{:else}
			<p class="mt-4 text-sm" data-testid="signed-in">{t.home.signedInAs}</p>
			<a href="/spaces/new" class="mt-4 inline-block rounded-full bg-black px-4 py-2 text-white">
				{t.home.startSpace}
			</a>
		{/if}
		<form method="POST" action="/logout" class="mt-4">
			<button type="submit" class="rounded-full border px-4 py-2">{t.logout}</button>
		</form>
	{:else}
		<a href="/login" class="mt-4 inline-block rounded-full bg-black px-4 py-2 text-white">
			{t.home.loginLink}
		</a>
	{/if}
</main>
