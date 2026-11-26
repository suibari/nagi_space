<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { messages } from '#lib/i18n/messages.ts';
	import type { PageProps } from './$types';

	const NAGI_URL = 'https://nagi.suibari.com/';

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale]);

	// 一覧を見ている間に始まった・終わった Space を反映する（LIFE-03）
	onMount(() => {
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') void invalidateAll();
		}, 15_000);
		return () => clearInterval(timer);
	});
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
			<a href="/spaces/new" class="btn-primary mt-4 inline-block">
				{t.home.startSpace}
			</a>
			<section class="mt-8">
				<h2 class="font-bold">{t.home.liveSpaces}</h2>
				{#if data.spaces.length === 0}
					<p class="mt-2 text-sm" data-testid="no-spaces">{t.home.noSpaces}</p>
				{:else}
					<ul class="mt-2 flex flex-col gap-3" data-testid="live-spaces">
						{#each data.spaces as space (space.id)}
							<li>
								<a href="/s/{space.id}" class="card block p-3" data-space-id={space.id}>
									<span class="block font-medium">{space.title}</span>
									<span class="block text-sm">{space.host.displayName ?? space.host.handle}</span>
									<span class="mt-1 flex flex-wrap gap-3 text-xs">
										<span>{t.home.speakers(space.speakers)}</span>
										<span>{t.home.listeners(space.listeners)}</span>
										{#if space.botPresent}<span>{t.home.botPresent}</span>{/if}
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
		<form method="POST" action="/logout" class="mt-4">
			<button type="submit" class="btn">{t.logout}</button>
		</form>
	{:else}
		<a href="/login" class="btn-primary mt-4 inline-block">
			{t.home.loginLink}
		</a>
	{/if}
</main>
