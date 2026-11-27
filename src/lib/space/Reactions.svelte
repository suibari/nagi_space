<script lang="ts">
	/**
	 * 絵文字リアクション（REACT-01）。届いた絵文字は画面の上を下から上へ大きく流し、送るときは
	 * 操作バーの上に開くシートから選ぶ。流す層は操作を受け付けないので、ボタンは覆わない。
	 */
	import { onMount } from 'svelte';
	import EmojiPicker from '#lib/emoji/EmojiPicker.svelte';
	import { choiceKey, type EmojiChoice } from '#lib/emoji/types.ts';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { SpaceConnection } from './room.svelte.ts';

	/** 表示する時間と、同時に出す数の上限（design.md D5） */
	const SHOW_MS = 3200;
	const MAX_SHOWN = 30;

	type Shown = {
		id: number;
		from: { did: string; name: string; avatar?: string };
		choice: EmojiChoice;
		/** 横の位置（%）と、少しずつ違う揺れ */
		x: number;
		drift: number;
	};

	let {
		spaceId,
		connection,
		locale,
		mutedDids,
		open = $bindable(false)
	}: {
		spaceId: string;
		connection: SpaceConnection;
		locale: Locale;
		mutedDids: string[];
		open?: boolean;
	} = $props();
	const t = $derived(messages[locale].space.emoji);

	let shown = $state<Shown[]>([]);
	let limited = $state(false);
	let failed = $state(false);
	let sending = $state<string>();
	let nextId = 0;

	onMount(() => {
		connection.onReaction = (raw) => {
			const message = raw as Partial<Shown> & { type?: string };
			if (message.type !== 'reaction' || !message.from || !message.choice) return;
			// 自分がミュートしている人の絵文字は自分の画面に出さない（PART-09）
			if (mutedDids.includes(message.from.did)) return;
			const item: Shown = {
				id: nextId++,
				from: message.from,
				choice: message.choice,
				x: 8 + Math.random() * 76,
				drift: Math.round((Math.random() - 0.5) * 48)
			};
			// 表示が終わったら消す。保存はしない（REACT-04）
			shown = [...shown.slice(-(MAX_SHOWN - 1)), item];
			setTimeout(() => (shown = shown.filter((s) => s.id !== item.id)), SHOW_MS);
		};
		return () => (connection.onReaction = undefined);
	});

	async function send(choice: EmojiChoice) {
		sending = choiceKey(choice);
		limited = false;
		failed = false;
		try {
			const response = await fetch(`/s/${spaceId}/react`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ choice })
			}).catch(() => undefined);
			limited = response?.status === 429;
			failed = !response?.ok && !limited;
		} finally {
			sending = undefined;
		}
	}
</script>

<div class="reaction-layer" aria-live="polite">
	{#each shown as item (item.id)}
		<div
			class="reaction"
			style:left="{item.x}%"
			style:--drift="{item.drift}px"
			data-testid="reaction"
			data-from={item.from.did}
		>
			{#if item.choice.kind === 'unicode'}
				<span class="emoji">{item.choice.emoji}</span>
			{:else}
				<img
					src={item.choice.emoji.url}
					alt={item.choice.emoji.alt ?? item.choice.emoji.name}
					class="emoji-img"
				/>
			{/if}
			<span class="from"><Avatar src={item.from.avatar} name={item.from.name} size={22} /></span>
		</div>
	{/each}
</div>

{#if open}
	<div class="sheet" role="dialog" aria-label={t.open}>
		<div class="sheet-head">
			<span class="font-semibold text-strong">{t.open}</span>
			<button type="button" class="close" aria-label={t.close} onclick={() => (open = false)}>
				<Icon name="x" size={18} />
			</button>
		</div>
		{#if limited}<p role="alert" class="text-sm text-danger">{t.rateLimited}</p>{/if}
		{#if failed}<p role="alert" class="text-sm text-danger">{t.failed}</p>{/if}
		<EmojiPicker {locale} onpick={send} pendingKey={sending} />
	</div>
{/if}

<style>
	.reaction-layer {
		position: fixed;
		inset-inline: 0;
		inset-block: 56px 80px;
		z-index: 20;
		overflow: hidden;
		pointer-events: none;
	}
	.reaction {
		position: absolute;
		inset-block-end: 0;
		display: inline-flex;
		translate: -50% 0;
		animation: rise 3.2s cubic-bezier(0.2, 0.6, 0.3, 1) forwards;
		will-change: transform, opacity;
	}
	.emoji {
		font-size: 48px;
		line-height: 1;
	}
	.emoji-img {
		inline-size: 48px;
		block-size: 48px;
		object-fit: contain;
	}
	.from {
		position: absolute;
		inset-inline-start: -6px;
		inset-block-end: -4px;
		border: 2px solid var(--bg);
		border-radius: 50%;
		display: inline-flex;
	}
	@keyframes rise {
		0% {
			transform: translate(0, 0) scale(0.6);
			opacity: 0;
		}
		12% {
			transform: translate(0, -8%) scale(1.05);
			opacity: 1;
		}
		80% {
			opacity: 1;
		}
		100% {
			transform: translate(var(--drift), -60vh) scale(1);
			opacity: 0;
		}
	}
	@keyframes appear {
		0% {
			opacity: 0;
		}
		15%,
		80% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}
	/* 視差効果を減らしている人には流さず、その場で出して消す */
	@media (prefers-reduced-motion: reduce) {
		.reaction {
			inset-block-end: 30%;
			animation-name: appear;
			animation-timing-function: linear;
		}
	}
	.sheet {
		position: fixed;
		inset-inline: 0;
		inset-block-end: calc(68px + env(safe-area-inset-bottom));
		z-index: 25;
		max-inline-size: 640px;
		margin-inline: auto;
		padding: 12px 16px 16px;
		border: 1px solid var(--line);
		border-radius: var(--radius-bubble) var(--radius-bubble) 0 0;
		background: var(--surface-1);
	}
	.sheet-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-block-end: 8px;
	}
	.close {
		display: flex;
		align-items: center;
		justify-content: center;
		inline-size: 36px;
		block-size: 36px;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
	}
	.close:hover {
		background: var(--surface-2);
	}
</style>
