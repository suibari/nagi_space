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
	import Button from '#lib/ui/Button.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { SpaceConnection } from './room.svelte.ts';

	/** 表示する時間と、同時に出す数の上限（design.md D5） */
	const SHOW_MS = 3200;
	const MAX_SHOWN = 30;
	/** コメントの長さの上限（COMM-01。サーバーでも確かめる） */
	const COMMENT_MAX = 30;

	type From = { did: string; name: string; avatar?: string };
	/** 流れる表示に出すもの。絵文字（REACT-01）かコメント（COMM-02） */
	type Shown = {
		id: number;
		from: From;
		choice?: EmojiChoice;
		text?: string;
		/** 横の位置（%）と、少しずつ違う揺れ */
		x: number;
		drift: number;
	};

	let {
		spaceId,
		connection,
		locale,
		mutedDids,
		allowComments,
		open = $bindable(false)
	}: {
		spaceId: string;
		connection: SpaceConnection;
		locale: Locale;
		mutedDids: string[];
		/** botたんSpace ではコメントを出さない（COMM-01） */
		allowComments: boolean;
		open?: boolean;
	} = $props();
	const t = $derived(messages[locale].space.emoji);
	const tc = $derived(messages[locale].space.comment);

	let shown = $state<Shown[]>([]);
	let limited = $state(false);
	let failed = $state(false);
	let sending = $state<string>();
	let draft = $state('');
	let commentPending = $state(false);
	let commentLimited = $state(false);
	let commentFailed = $state(false);
	let nextId = 0;

	const segmenter = new Intl.Segmenter('ja', { granularity: 'grapheme' });
	const draftLength = $derived([...segmenter.segment(draft.trim())].length);
	const canSend = $derived(
		draft.trim().length > 0 && draftLength <= COMMENT_MAX && !commentPending
	);

	function show(from: From, content: { choice?: EmojiChoice; text?: string }) {
		// 自分がミュートしている人のものは自分の画面に出さない（PART-09）
		if (mutedDids.includes(from.did)) return;
		const item: Shown = {
			id: nextId++,
			from,
			...content,
			// コメントは幅があるので、画面の端で切れないよう中央寄りに出す
			x: content.text ? 30 + Math.random() * 40 : 8 + Math.random() * 76,
			drift: Math.round((Math.random() - 0.5) * 48)
		};
		// 表示が終わったら消す。保存はしない（REACT-04・COMM-04）
		shown = [...shown.slice(-(MAX_SHOWN - 1)), item];
		setTimeout(() => (shown = shown.filter((s) => s.id !== item.id)), SHOW_MS);
	}

	onMount(() => {
		connection.onReaction = (raw) => {
			const message = raw as { type?: string; from?: From; choice?: EmojiChoice };
			if (message.type === 'reaction' && message.from && message.choice)
				show(message.from, { choice: message.choice });
		};
		const onComment = (raw: unknown) => {
			const message = raw as { from?: From; text?: unknown };
			if (message.from && typeof message.text === 'string')
				show(message.from, { text: message.text });
		};
		connection.commentListeners.add(onComment);
		return () => {
			connection.onReaction = undefined;
			connection.commentListeners.delete(onComment);
		};
	});

	/** 送れたらシートを閉じ、自分の送ったものが流れるのを見せる（REACT-01・COMM-01） */
	function closeAfterSent() {
		open = false;
		document.getElementById('reaction-toggle')?.focus();
	}

	async function sendComment(event: SubmitEvent) {
		event.preventDefault();
		if (!canSend) return;
		commentPending = true;
		commentLimited = false;
		commentFailed = false;
		try {
			const response = await fetch(`/s/${spaceId}/comment`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ text: draft })
			}).catch(() => undefined);
			if (response?.ok) {
				draft = '';
				closeAfterSent();
			}
			commentLimited = response?.status === 429;
			commentFailed = !response?.ok && !commentLimited;
		} finally {
			commentPending = false;
		}
	}

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
			if (response?.ok) closeAfterSent();
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
			data-testid={item.text === undefined ? 'reaction' : 'comment'}
			data-from={item.from.did}
		>
			{#if item.text !== undefined}
				<!-- コメントは文字として出す（COMM-03） -->
				<span class="bubble" data-testid="flowing-comment">
					<Avatar src={item.from.avatar} name={item.from.name} size={22} />
					<span class="bubble-text">{item.text}</span>
				</span>
			{:else if item.choice?.kind === 'unicode'}
				<span class="emoji">{item.choice.emoji}</span>
			{:else if item.choice}
				<img
					src={item.choice.emoji.url}
					alt={item.choice.emoji.alt ?? item.choice.emoji.name}
					class="emoji-img"
				/>
			{/if}
			{#if item.text === undefined}
				<span class="from"><Avatar src={item.from.avatar} name={item.from.name} size={22} /></span>
			{/if}
		</div>
	{/each}
</div>

{#if open}
	<div class="sheet" role="dialog" aria-label={t.sheet}>
		<div class="sheet-head">
			<span class="font-semibold text-strong">{t.sheet}</span>
			<button type="button" class="close" aria-label={t.close} onclick={() => (open = false)}>
				<Icon name="x" size={18} />
			</button>
		</div>
		{#if allowComments}
			<form class="comment-form" onsubmit={sendComment} data-testid="comment-form">
				<input
					type="text"
					class="field"
					bind:value={draft}
					placeholder={tc.placeholder}
					aria-label={tc.label}
					aria-describedby="comment-count"
					enterkeyhint="send"
				/>
				<Button type="submit" variant="primary" pending={commentPending} disabled={!canSend}>
					{tc.send}
				</Button>
			</form>
			<p
				id="comment-count"
				class="mt-1 text-xs"
				class:text-danger={draftLength > COMMENT_MAX}
				class:text-muted={draftLength <= COMMENT_MAX}
			>
				{draftLength > COMMENT_MAX
					? tc.tooLong(COMMENT_MAX)
					: tc.remaining(COMMENT_MAX - draftLength)}
			</p>
			{#if commentLimited}<p role="alert" class="text-sm text-danger">{tc.rateLimited}</p>{/if}
			{#if commentFailed}<p role="alert" class="text-sm text-danger">{tc.failed}</p>{/if}
			<hr class="my-3 border-line" />
		{/if}
		{#if limited}<p role="alert" class="text-sm text-danger">{t.rateLimited}</p>{/if}
		{#if failed}<p role="alert" class="text-sm text-danger">{t.failed}</p>{/if}
		<EmojiPicker {locale} onpick={send} pendingKey={sending} />
	</div>
{/if}

<style>
	/* 中央の段（640px）の幅で流す。広い画面で本文から離れた端に出さない */
	.reaction-layer {
		position: fixed;
		inset-inline: 0;
		max-inline-size: 640px;
		margin-inline: auto;
	}
	@media (min-width: 1024px) {
		.reaction-layer {
			max-inline-size: 1200px;
		}
	}
	.reaction-layer {
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
	.bubble {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		max-inline-size: 240px;
		padding: 6px 12px 6px 6px;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: var(--overlay);
		color: var(--text-strong);
		font-size: 1rem;
		line-height: 1.35;
	}
	.bubble-text {
		overflow-wrap: anywhere;
	}
	.comment-form {
		display: flex;
		gap: 8px;
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
