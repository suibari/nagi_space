<script lang="ts">
	import { messages } from '#lib/i18n/messages.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(messages[data.locale].newSpace);
</script>

<svelte:head>
	<title>{t.title} | Nagi Space</title>
</svelte:head>

<main class="mx-auto max-w-xl px-4 py-12">
	<h1 class="text-2xl font-bold">{t.title}</h1>

	{#if data.activeSpaceId}
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
					value={typeof form?.title === 'string' ? form.title : ''}
					class="rounded-lg border px-3 py-2"
				/>
			</label>
			<fieldset class="flex flex-col gap-2">
				<legend class="text-sm font-medium">{t.kindLabel}</legend>
				<label class="flex gap-2">
					<input type="radio" name="kind" value="public" checked={form?.kind !== 'bot'} />
					<span>
						<span class="font-medium">{t.kindPublic}</span><br /><small>{t.kindPublicHint}</small>
					</span>
				</label>
				<label class="flex gap-2">
					<input type="radio" name="kind" value="bot" checked={form?.kind === 'bot'} />
					<span>
						<span class="font-medium">{t.kindBot}</span><br /><small>{t.kindBotHint}</small>
					</span>
				</label>
			</fieldset>
			{#if form?.error}
				<p role="alert" class="text-sm text-red-700">{t.errors[form.error]}</p>
			{/if}
			<button type="submit" class="rounded-full bg-black px-4 py-2 font-medium text-white">
				{t.submit}
			</button>
		</form>
	{/if}
</main>
