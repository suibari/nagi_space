<script lang="ts">
	import { onMount } from 'svelte';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Spinner from '#lib/ui/Spinner.svelte';
	import { loadRecent, pushRecent } from './recent.ts';
	import { choiceKey, type CustomEmoji, type EmojiChoice } from './types.ts';
	import {
		loadUnicodeEmojiIndex,
		searchUnicodeEmojis,
		type UnicodeEmoji
	} from './unicodeSearch.ts';

	let {
		locale,
		onpick,
		pendingKey
	}: {
		locale: Locale;
		onpick: (choice: EmojiChoice) => void;
		/** 送っている絵文字（スピナーを重ねる。LOOK-08） */
		pendingKey?: string;
	} = $props();
	const t = $derived(messages[locale].space.emoji);

	let query = $state('');
	let favorites = $state<EmojiChoice[]>([]);
	let recent = $state<EmojiChoice[]>([]);
	let custom = $state<CustomEmoji[]>([]);
	let unicode = $state<UnicodeEmoji[]>([]);
	let index: UnicodeEmoji[] | undefined;

	onMount(() => {
		recent = loadRecent();
		void fetch('/emoji/favorites')
			.then((response) => (response.ok ? response.json() : { favorites: [] }))
			.then((body: { favorites: EmojiChoice[] }) => (favorites = body.favorites));
		void loadUnicodeEmojiIndex(locale).then((loaded) => (index = loaded));
	});

	// 入力が止まってから検索する。カスタム絵文字を Unicode 絵文字より先に並べる（EMOJI-02）
	$effect(() => {
		const q = query.trim();
		if (!q) {
			custom = [];
			unicode = [];
			return;
		}
		const timer = setTimeout(async () => {
			unicode = index ? searchUnicodeEmojis(index, q, 40) : [];
			const response = await fetch(`/emoji/search?q=${encodeURIComponent(q)}`).catch(
				() => undefined
			);
			custom = response?.ok ? ((await response.json()) as { custom: CustomEmoji[] }).custom : [];
		}, 250);
		return () => clearTimeout(timer);
	});

	function pick(choice: EmojiChoice) {
		recent = pushRecent(choice);
		onpick(choice);
	}
</script>

{#snippet emojiButton(choice: EmojiChoice, label: string)}
	<button
		type="button"
		class="relative flex h-11 w-11 items-center justify-center rounded-md text-2xl hover:bg-surface-2 disabled:cursor-progress"
		title={label}
		aria-label={label}
		aria-busy={pendingKey === choiceKey(choice) ? 'true' : undefined}
		disabled={pendingKey !== undefined}
		data-emoji={choiceKey(choice)}
		onclick={() => pick(choice)}
	>
		{#if pendingKey === choiceKey(choice)}
			<span
				class="absolute inset-0 flex items-center justify-center rounded-md bg-overlay text-accent-strong"
			>
				<Spinner size="sm" decorative />
			</span>
		{/if}
		{#if choice.kind === 'unicode'}
			{choice.emoji}
		{:else}
			<img src={choice.emoji.url} alt="" class="h-7 w-7 object-contain" loading="lazy" />
		{/if}
	</button>
{/snippet}

{#snippet group(title: string, choices: EmojiChoice[])}
	{#if choices.length}
		<h4 class="mt-3 mb-1 text-xs font-semibold text-muted">{title}</h4>
		<div class="flex flex-wrap">
			{#each choices as choice (choiceKey(choice))}
				{@render emojiButton(
					choice,
					choice.kind === 'unicode' ? choice.emoji : (choice.emoji.alt ?? choice.emoji.name)
				)}
			{/each}
		</div>
	{/if}
{/snippet}

<section class="w-full" data-testid="emoji-picker">
	<input
		type="search"
		bind:value={query}
		placeholder={t.search}
		aria-label={t.search}
		class="field"
	/>
	<div class="mt-2 max-h-[40dvh] overflow-y-auto">
		{#if query.trim()}
			{@render group(
				t.custom,
				custom.map((emoji) => ({ kind: 'custom', emoji }))
			)}
			{@render group(
				t.unicode,
				unicode.map((item) => ({ kind: 'unicode', emoji: item.emoji }))
			)}
			{#if !custom.length && !unicode.length}<p class="p-2 text-sm">{t.none}</p>{/if}
		{:else}
			{@render group(t.favorites, favorites)}
			{@render group(t.recent, recent)}
			{@render group(
				t.unicode,
				['👏', '😂', '🥰', '🎉', '🙌', '💯', '🔥', '👀'].map((emoji) => ({
					kind: 'unicode',
					emoji
				}))
			)}
		{/if}
	</div>
</section>
