<script lang="ts">
	import { messages } from '#lib/i18n/messages.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale]);
</script>

<svelte:head>
	<title>Nagi Space</title>
</svelte:head>

<main class="mx-auto max-w-xl px-4 py-12">
	<h1 class="text-2xl font-bold">Nagi Space</h1>
	{#if data.did}
		<p class="mt-4 text-sm" data-testid="signed-in">{t.home.signedInAs}</p>
		<form method="POST" action="/logout" class="mt-2">
			<button type="submit" class="rounded-full border px-4 py-2">{t.logout}</button>
		</form>
	{:else}
		<a href="/login" class="mt-4 inline-block rounded-full bg-black px-4 py-2 text-white">
			{t.home.loginLink}
		</a>
	{/if}
</main>
