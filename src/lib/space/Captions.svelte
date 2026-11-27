<script lang="ts">
	/**
	 * 「字幕とコメント」の欄（TRANS-01・03・04、COMM-02）。入室してからの字幕とコメントを届いた順に
	 * 並べる。保存はしない。下端にいるときだけ新しい行を追い、読み返している間は位置を動かさない。
	 */
	import { onMount, tick } from 'svelte';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { SpaceConnection } from './room.svelte.ts';

	const KEEP = 200;
	/** 下端からこの距離の中にいれば「下端にいる」とみなす */
	const FOLLOW_PX = 24;

	type Line =
		| { id: number; kind: 'caption'; speaker: string; name: string; text: string }
		| {
				id: number;
				kind: 'comment';
				from: { did: string; name: string; avatar?: string };
				text: string;
		  };

	let {
		connection,
		locale,
		mutedDids
	}: { connection: SpaceConnection; locale: Locale; mutedDids: string[] } = $props();
	const t = $derived(messages[locale].space.captions);
	const tc = $derived(messages[locale].space.comment);

	let lines = $state<Line[]>([]);
	let paused = $state(false);
	let box: HTMLDivElement;
	let nextId = 0;

	async function append(line: Line) {
		const follow = !box || box.scrollHeight - box.scrollTop - box.clientHeight <= FOLLOW_PX;
		lines = [...lines.slice(-(KEEP - 1)), line];
		if (!follow) return;
		await tick();
		box?.scrollTo({ top: box.scrollHeight });
	}

	onMount(() => {
		connection.onCaption = (raw) => {
			const message = raw as { type?: string; speaker?: string; name?: string; text?: string };
			if (message.type === 'captions.paused') paused = true;
			else if (message.type === 'captions.resumed') paused = false;
			else if (message.type === 'caption' && message.text && message.speaker) {
				void append({
					id: nextId++,
					kind: 'caption',
					speaker: message.speaker,
					name: message.name ?? '',
					text: message.text
				});
			}
		};
		// 字幕の一時停止中もコメントは並べる。ミュートしている人のものは出さない（PART-09）
		const onComment = (raw: unknown) => {
			const { from, text } = raw as {
				from?: { did: string; name: string; avatar?: string };
				text?: unknown;
			};
			if (!from || typeof text !== 'string' || mutedDids.includes(from.did)) return;
			void append({ id: nextId++, kind: 'comment', from, text });
		};
		connection.commentListeners.add(onComment);
		return () => {
			connection.onCaption = undefined;
			connection.commentListeners.delete(onComment);
		};
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
		class="mt-3 flex max-h-56 flex-col gap-1.5 overflow-y-auto text-sm"
		aria-live="polite"
		data-testid="timeline"
	>
		{#each lines as line (line.id)}
			{#if line.kind === 'caption'}
				<p data-testid="caption-line" data-speaker={line.speaker}>
					<span class="font-semibold text-strong">{line.name}</span>{t.separator}{line.text}
				</p>
			{:else}
				<p class="comment-line" data-testid="comment-line" data-from={line.from.did}>
					<span class="mark" aria-hidden="true"><Icon name="comment" size={14} /></span>
					<Avatar src={line.from.avatar} name={line.from.name} size={20} />
					<span class="min-w-0">
						<span class="visually-hidden">{tc.mark}</span>
						<span class="font-semibold text-strong">{line.from.name}</span>{t.separator}{line.text}
					</span>
				</p>
			{/if}
		{:else}
			<p class="text-muted">{t.empty}</p>
		{/each}
	</div>
	<p class="mt-3 text-xs text-muted">{t.notice}</p>
</section>

<style>
	.comment-line {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		padding: 4px 8px;
		border-radius: var(--radius-md);
		background: var(--surface-2);
		overflow-wrap: anywhere;
	}
	.mark {
		display: inline-flex;
		margin-block-start: 3px;
		color: var(--accent-strong);
	}
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
</style>
