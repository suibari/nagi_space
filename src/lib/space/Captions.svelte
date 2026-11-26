<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import type { SpaceConnection } from './room.svelte.ts';

	const KEEP = 200;

	type Line = { id: number; speaker: string; name: string; text: string };

	let { connection, locale }: { connection: SpaceConnection; locale: Locale } = $props();
	const t = $derived(messages[locale].space.captions);

	// 入室してからの字幕だけを持つ。保存はしない（TRANS-04）
	let lines = $state<Line[]>([]);
	let paused = $state(false);
	let box: HTMLDivElement;
	let nextId = 0;

	onMount(() => {
		connection.onCaption = async (raw) => {
			const message = raw as { type?: string; speaker?: string; name?: string; text?: string };
			if (message.type === 'captions.paused') paused = true;
			else if (message.type === 'captions.resumed') paused = false;
			else if (message.type === 'caption' && message.text && message.speaker) {
				lines = [
					...lines.slice(-(KEEP - 1)),
					{ id: nextId++, speaker: message.speaker, name: message.name ?? '', text: message.text }
				];
				await tick();
				box?.scrollTo({ top: box.scrollHeight });
			}
		};
		return () => (connection.onCaption = undefined);
	});
</script>

<section class="mt-6" data-testid="captions">
	<h2 class="font-bold">{t.title}</h2>
	<p class="text-xs">{t.notice}</p>
	{#if paused}<p class="mt-1 text-sm" role="status" data-testid="captions-paused">
			{t.paused}
		</p>{/if}
	<div
		bind:this={box}
		class="mt-2 max-h-48 overflow-y-auto rounded-xl border p-2 text-sm"
		aria-live="polite"
	>
		{#each lines as line (line.id)}
			<p data-testid="caption-line" data-speaker={line.speaker}>
				<span class="font-medium">{line.name}</span>：{line.text}
			</p>
		{:else}
			<p class="text-xs">{t.empty}</p>
		{/each}
	</div>
</section>
