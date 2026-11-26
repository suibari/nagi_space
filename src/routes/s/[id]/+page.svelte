<script lang="ts">
	import { onMount } from 'svelte';
	import { messages } from '#lib/i18n/messages.ts';
	import { SpaceConnection } from '#lib/space/room.svelte.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale].space);
	let audioContainer: HTMLDivElement;
	let connection = $state<SpaceConnection>();
	let failed = $state(false);

	onMount(() => {
		if (data.state !== 'live') return;
		const current = new SpaceConnection(audioContainer);
		connection = current;
		(async () => {
			const response = await fetch(`/s/${data.space.id}/token`, { method: 'POST' });
			if (!response.ok) throw new Error(`token ${response.status}`);
			const { url, token } = (await response.json()) as { url: string; token: string };
			await current.connect(url, token);
		})().catch((cause) => {
			console.warn('[space] connect failed', cause);
			failed = true;
		});
		return () => void current.disconnect();
	});

	const roleLabel = (role: 'host' | 'speaker' | 'listener') => t[role];
	const canSpeak = $derived(data.state === 'live' && data.role !== 'listener');
</script>

<svelte:head>
	<title
		>{data.state === 'notFound'
			? 'Nagi Space'
			: `${data.space?.title ?? data.title} | Nagi Space`}</title
	>
</svelte:head>

<main class="mx-auto max-w-xl px-4 py-8">
	{#if data.state === 'notFound'}
		<p data-testid="not-found">{t.notFound}</p>
	{:else if data.state === 'ended'}
		<h1 class="text-xl font-bold">{data.title}</h1>
		<p class="mt-2" data-testid="ended">{t.ended}</p>
	{:else}
		<h1 class="text-xl font-bold" data-testid="space-title">{data.space.title}</h1>
		<p class="mt-1 text-sm">
			{t.host}: {data.space.host.displayName ?? data.space.host.handle}
		</p>

		{#if data.state === 'anonymous'}
			<a
				href="/login?returnTo={encodeURIComponent(`/s/${data.space.id}`)}"
				class="mt-6 inline-block rounded-full bg-black px-4 py-2 text-white"
			>
				{t.loginToJoin}
			</a>
		{:else if data.state === 'unregistered'}
			<p class="mt-6">{t.unregistered}</p>
		{:else}
			<p class="mt-4 text-sm" data-testid="connection-state">
				{failed ? t.disconnected : t[connection?.state ?? 'connecting']}
			</p>

			{#if connection && !connection.canPlayAudio}
				<button
					type="button"
					class="mt-4 rounded-full border px-4 py-2"
					onclick={() => connection?.startAudio()}
				>
					{t.startAudio}
				</button>
			{/if}

			{#if canSpeak && connection?.state === 'connected'}
				<button
					type="button"
					class="mt-4 rounded-full bg-black px-4 py-2 text-white"
					onclick={() => connection?.setMic(!connection.micOn)}
				>
					{connection.micOn ? t.micOff : t.micOn}
				</button>
			{/if}

			<h2 class="mt-8 font-bold">{t.participants}</h2>
			<ul class="mt-2 flex flex-col gap-2" data-testid="participants">
				{#each connection?.participants ?? [] as participant (participant.identity)}
					<li class="flex items-center gap-2" data-role={participant.role}>
						<span class:font-bold={participant.speaking}>{participant.name}</span>
						<span class="text-xs">{roleLabel(participant.role)}</span>
						{#if participant.speaking}<span class="text-xs">{t.speaking}</span>{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
	<div bind:this={audioContainer} hidden></div>
</main>
