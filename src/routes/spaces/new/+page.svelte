<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { messages } from '#lib/i18n/messages.ts';
	import Button from '#lib/ui/Button.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(messages[data.locale].newSpace);

	// 送信に失敗したときにサーバーが返した入力値で初期化する（その後は入力欄が持つ）
	const initial = untrack(() => ({
		title: typeof form?.title === 'string' ? form.title : '',
		kind: form?.kind === 'bot' ? 'bot' : 'public',
		share: form?.share === true,
		shareText: typeof form?.shareText === 'string' ? form.shareText : ''
	}));
	let title = $state(initial.title);
	let kind = $state(initial.kind);
	let share = $state(initial.share);
	let shareText = $state(initial.shareText);
	let shareTextEdited = $state(initial.shareText !== '');
	let pending = $state(false);

	// 本文を編集するまでは、タイトルに合わせた初期値にする（編集できる。LIFE-04）
	const defaultShareText = $derived(t.shareDefault(title.trim()));
	$effect(() => {
		if (!shareTextEdited) shareText = defaultShareText;
	});
</script>

<svelte:head>
	<title>{t.title} | Nagi Space</title>
</svelte:head>

<main class="mx-auto max-w-xl px-4 py-10">
	<h1 class="text-xl font-bold text-strong">{t.title}</h1>

	{#if !data.canCreate}
		<p class="card mt-6 p-5" data-testid="not-allowed">{t.notAllowed}</p>
	{:else if data.activeSpaceId}
		<section class="card mt-6 flex flex-col items-start gap-3 p-5" data-testid="active-space">
			<p>{t.active}</p>
			<Button variant="primary" href="/s/{data.activeSpaceId}">{t.backToActive}</Button>
		</section>
	{:else}
		<!-- 画面が切り替わるまでスピナーを出し、二重に作らない（LOOK-08） -->
		<form
			method="POST"
			class="mt-6 flex flex-col gap-6"
			use:enhance={() => {
				pending = true;
				return async ({ update }) => {
					await update({ reset: false });
					pending = false;
				};
			}}
		>
			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-semibold">{t.titleLabel}</span>
				<input name="title" type="text" required bind:value={title} class="field" />
			</label>

			<fieldset class="flex flex-col gap-2">
				<legend class="mb-1.5 text-sm font-semibold">{t.kindLabel}</legend>
				<label class="choice" class:selected={kind === 'public'}>
					<input type="radio" name="kind" value="public" bind:group={kind} />
					<span>
						<span class="block font-semibold text-strong">{t.kindPublic}</span>
						<span class="block text-sm text-muted">{t.kindPublicHint}</span>
					</span>
				</label>
				<label class="choice" class:selected={kind === 'bot'}>
					<input type="radio" name="kind" value="bot" bind:group={kind} />
					<span>
						<span class="block font-semibold text-strong">{t.kindBot}</span>
						<span class="block text-sm text-muted">{t.kindBotHint}</span>
					</span>
				</label>
			</fieldset>

			<!-- botたんSpace はシェアしない（LIFE-02） -->
			{#if kind === 'public'}
				<fieldset class="flex flex-col gap-3">
					<label class="choice" class:selected={share}>
						<input type="checkbox" name="share" bind:checked={share} />
						<span>
							<span class="block font-semibold text-strong">{t.share}</span>
							<span class="block text-sm text-muted">{t.shareHint}</span>
						</span>
					</label>
					{#if share}
						<label class="flex flex-col gap-1.5">
							<span class="text-sm font-semibold">{t.shareTextLabel}</span>
							<textarea
								name="shareText"
								rows="3"
								bind:value={shareText}
								oninput={() => (shareTextEdited = true)}
								class="field"></textarea>
						</label>
					{/if}
				</fieldset>
			{/if}

			{#if form?.error}
				<p role="alert" class="text-sm text-danger">{t.errors[form.error]}</p>
			{/if}
			<div class="flex flex-wrap gap-2">
				<Button type="submit" variant="primary" size="lg" {pending}>{t.submit}</Button>
				<Button href="/" size="lg">{t.cancel}</Button>
			</div>
		</form>
	{/if}
</main>

<style>
	.choice {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 14px 16px;
		border: 1px solid var(--line);
		border-radius: var(--radius-bubble);
		background: var(--surface-1);
		cursor: pointer;
	}
	.choice input {
		flex: none;
		margin-block-start: 4px;
		accent-color: var(--accent-strong);
	}
	.choice.selected {
		border-color: var(--accent-strong);
		background: color-mix(in srgb, var(--accent-soft) 45%, var(--surface-1));
	}
</style>
