<script lang="ts">
	import { messages } from '#lib/i18n/messages.ts';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(messages[data.locale].login);
	const error = $derived(form?.error ?? data.error);
</script>

<svelte:head>
	<title>{t.title} | Nagi Space</title>
</svelte:head>

<main class="mx-auto max-w-sm px-4 py-12">
	<h1 class="text-2xl font-bold">{t.title}</h1>
	<p class="mt-2 text-sm">{t.lead}</p>

	<form method="POST" class="mt-6 flex flex-col gap-3">
		<input type="hidden" name="returnTo" value={data.returnTo} />
		<label class="flex flex-col gap-1">
			<span class="text-sm font-medium">{t.handleLabel}</span>
			<input
				name="handle"
				type="text"
				autocomplete="username"
				autocapitalize="none"
				spellcheck="false"
				required
				placeholder={t.handlePlaceholder}
				value={form?.handle ?? ''}
				class="rounded-md border border-line-strong px-3 py-2"
			/>
		</label>
		{#if error}
			<p role="alert" class="text-sm text-danger">{t.errors[error]}</p>
		{/if}
		<button type="submit" class="btn-primary">
			{t.submit}
		</button>
	</form>
</main>
