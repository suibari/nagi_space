<script lang="ts">
	import { untrack } from 'svelte';
	import { messages } from '#lib/i18n/messages.ts';
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

	// 本文を編集するまでは、タイトルに合わせた初期値にする（編集できる。LIFE-04）
	const defaultShareText = $derived(t.shareDefault(title.trim()));
	$effect(() => {
		if (!shareTextEdited) shareText = defaultShareText;
	});
</script>

<svelte:head>
	<title>{t.title} | Nagi Space</title>
</svelte:head>

<main class="mx-auto max-w-xl px-4 py-12">
	<h1 class="text-2xl font-bold">{t.title}</h1>

	{#if !data.canCreate}
		<p class="mt-6" data-testid="not-allowed">{t.notAllowed}</p>
	{:else if data.activeSpaceId}
		<section class="mt-6" data-testid="active-space">
			<p>{t.active}</p>
			<a href="/s/{data.activeSpaceId}" class="mt-2 inline-block underline">{t.backToActive}</a>
		</section>
	{:else}
		<form method="POST" class="mt-6 flex flex-col gap-4">
			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium">{t.titleLabel}</span>
				<input
					name="title"
					type="text"
					required
					bind:value={title}
					class="rounded-md border border-line-strong px-3 py-2"
				/>
			</label>
			<fieldset class="flex flex-col gap-2">
				<legend class="text-sm font-medium">{t.kindLabel}</legend>
				<label class="flex gap-2">
					<input type="radio" name="kind" value="public" bind:group={kind} />
					<span>
						<span class="font-medium">{t.kindPublic}</span><br /><small>{t.kindPublicHint}</small>
					</span>
				</label>
				<label class="flex gap-2">
					<input type="radio" name="kind" value="bot" bind:group={kind} />
					<span>
						<span class="font-medium">{t.kindBot}</span><br /><small>{t.kindBotHint}</small>
					</span>
				</label>
			</fieldset>

			<!-- botたんSpace はシェアしない（LIFE-02） -->
			{#if kind === 'public'}
				<fieldset class="flex flex-col gap-2">
					<label class="flex gap-2">
						<input type="checkbox" name="share" bind:checked={share} />
						<span>
							<span class="font-medium">{t.share}</span><br /><small>{t.shareHint}</small>
						</span>
					</label>
					{#if share}
						<label class="flex flex-col gap-1">
							<span class="text-sm font-medium">{t.shareTextLabel}</span>
							<textarea
								name="shareText"
								rows="3"
								bind:value={shareText}
								oninput={() => (shareTextEdited = true)}
								class="rounded-md border border-line-strong px-3 py-2"></textarea>
						</label>
					{/if}
				</fieldset>
			{/if}

			{#if form?.error}
				<p role="alert" class="text-sm text-danger">{t.errors[form.error]}</p>
			{/if}
			<button type="submit" class="btn-primary">
				{t.submit}
			</button>
		</form>
	{/if}
</main>
