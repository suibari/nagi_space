<script lang="ts">
	import { onMount } from 'svelte';
	import EmojiPicker from '#lib/emoji/EmojiPicker.svelte';
	import type { EmojiChoice } from '#lib/emoji/types.ts';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import type { SpaceConnection } from './room.svelte.ts';

	const SHOW_MS = 4000;

	type Shown = {
		id: number;
		from: { did: string; name: string; avatar?: string };
		choice: EmojiChoice;
	};

	let {
		spaceId,
		connection,
		locale,
		mutedDids
	}: { spaceId: string; connection: SpaceConnection; locale: Locale; mutedDids: string[] } =
		$props();
	const t = $derived(messages[locale].space.emoji);

	let shown = $state<Shown[]>([]);
	let open = $state(false);
	let limited = $state(false);
	let nextId = 0;

	onMount(() => {
		connection.onReaction = (raw) => {
			const message = raw as Partial<Shown> & { type?: string };
			if (message.type !== 'reaction' || !message.from || !message.choice) return;
			// 自分がミュートしている人の絵文字は自分の画面に出さない（PART-09）
			if (mutedDids.includes(message.from.did)) return;
			const item: Shown = { id: nextId++, from: message.from, choice: message.choice };
			// 表示が終わったら消す。保存はしない（REACT-04）
			shown = [...shown.slice(-19), item];
			setTimeout(() => (shown = shown.filter((s) => s.id !== item.id)), SHOW_MS);
		};
		return () => (connection.onReaction = undefined);
	});

	async function send(choice: EmojiChoice) {
		const response = await fetch(`/s/${spaceId}/react`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ choice })
		});
		limited = response.status === 429;
	}
</script>

<div
	class="pointer-events-none fixed right-4 bottom-24 flex flex-col items-end gap-1"
	aria-live="polite"
>
	{#each shown as item (item.id)}
		<div
			class="flex items-center gap-1 rounded-full bg-overlay px-2 py-1 shadow"
			data-testid="reaction"
			data-from={item.from.did}
		>
			{#if item.from.avatar}
				<img src={item.from.avatar} alt="" class="h-6 w-6 rounded-full" />
			{:else}
				<span class="text-xs">{item.from.name}</span>
			{/if}
			{#if item.choice.kind === 'unicode'}
				<span class="text-2xl">{item.choice.emoji}</span>
			{:else}
				<img
					src={item.choice.emoji.url}
					alt={item.choice.emoji.alt ?? item.choice.emoji.name}
					class="h-7 w-7"
				/>
			{/if}
		</div>
	{/each}
</div>

<div class="mt-4">
	<button type="button" class="btn" onclick={() => (open = !open)}>
		{open ? t.close : t.open}
	</button>
	{#if limited}<p role="alert" class="mt-1 text-sm">{t.rateLimited}</p>{/if}
	{#if open}
		<div class="mt-2"><EmojiPicker {locale} onpick={send} /></div>
	{/if}
</div>
