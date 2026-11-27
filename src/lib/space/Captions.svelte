<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Icon from '#lib/ui/Icon.svelte';
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

<section class="card p-4" data-testid="captions">
	<div class="flex items-center gap-2">
		<span class="text-accent-strong"><Icon name="captions" size={18} /></span>
		<h2 class="font-bold text-strong">{t.title}</h2>
		{#if paused}<span
				class="ml-auto rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted"
				role="status"
				data-testid="captions-paused"
			>
				{t.paused}
			</span>{/if}
	</div>
	<div
		bind:this={box}
		class="mt-3 flex max-h-44 flex-col gap-1.5 overflow-y-auto text-sm"
		aria-live="polite"
	>
		{#each lines as line (line.id)}
			<p data-testid="caption-line" data-speaker={line.speaker}>
				<span class="font-semibold text-strong">{line.name}</span>{t.separator}{line.text}
			</p>
		{:else}
			<p class="text-muted">{t.empty}</p>
		{/each}
	</div>
	<p class="mt-3 text-xs text-muted">{t.notice}</p>
</section>
