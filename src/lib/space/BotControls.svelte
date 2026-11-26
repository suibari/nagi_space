<script lang="ts">
	import { onMount } from 'svelte';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import type { SpaceConnection } from './room.svelte.ts';

	const POLL_MS = 5000;

	type BotState = { requested: boolean; present: boolean; available: boolean };

	let {
		spaceId,
		connection,
		locale
	}: { spaceId: string; connection: SpaceConnection; locale: Locale } = $props();
	const t = $derived(messages[locale].space.botControls);

	let botState = $state<BotState>();
	let left = $state(false);
	let busy = $state(false);

	async function refresh() {
		const response = await fetch(`/s/${spaceId}/bot`).catch(() => undefined);
		if (response?.ok) botState = (await response.json()) as BotState;
	}

	async function act(action: 'invite' | 'remove') {
		busy = true;
		left = false;
		await fetch(`/s/${spaceId}/bot`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ action })
		}).catch(() => undefined);
		busy = false;
		await refresh();
	}

	onMount(() => {
		void refresh();
		// 空きができたら招待の操作を使えるようにする（BOT-02）
		const timer = setInterval(() => void refresh(), POLL_MS);
		const previous = connection.onControl;
		connection.onControl = (message) => {
			previous?.(message);
			if (message.type === 'bot.left') {
				left = true;
				void refresh();
			}
		};
		return () => {
			clearInterval(timer);
			connection.onControl = previous;
		};
	});

	const inRoom = $derived(connection.botPresent);
</script>

{#if botState}
	<section class="mt-4 text-sm" data-testid="bot-controls">
		{#if left}<p role="alert" data-testid="bot-left">{t.left}</p>{/if}
		{#if inRoom || botState.requested}
			{#if !inRoom}<p data-testid="bot-joining">{t.joining}</p>{/if}
			<button type="button" class="btn" disabled={busy} onclick={() => act('remove')}>
				{t.remove}
			</button>
		{:else}
			<button
				type="button"
				class="btn"
				disabled={busy || !botState.available}
				onclick={() => act('invite')}
			>
				{t.invite}
			</button>
			{#if !botState.available}<p class="mt-1" data-testid="bot-busy">{t.busy}</p>{/if}
		{/if}
	</section>
{/if}
