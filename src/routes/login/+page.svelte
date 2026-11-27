<script lang="ts">
	import { enhance } from '$app/forms';
	import { messages } from '#lib/i18n/messages.ts';
	import Button from '#lib/ui/Button.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
	const t = $derived(messages[data.locale].login);
	const error = $derived(form?.error ?? data.error);
	let pending = $state(false);
</script>

<svelte:head>
	<title>{t.title} | Nagi Space</title>
</svelte:head>

<main class="mx-auto max-w-md px-4 py-10">
	<section class="card p-6">
		<h1 class="text-xl font-bold text-strong">{t.title}</h1>
		<p class="mt-2 text-sm text-muted">{t.lead}</p>

		<!-- 認可サーバーへ移るまでスピナーを出す（LOOK-08） -->
		<form
			method="POST"
			class="mt-6 flex flex-col gap-4"
			use:enhance={() => {
				pending = true;
				return async ({ result, update }) => {
					// 認可サーバー（別の origin）へは、ページごと移る
					if (
						result.type === 'redirect' &&
						new URL(result.location, location.href).origin !== location.origin
					) {
						location.href = result.location;
						return;
					}
					await update();
					pending = false;
				};
			}}
		>
			<input type="hidden" name="returnTo" value={data.returnTo} />
			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-semibold">{t.handleLabel}</span>
				<input
					name="handle"
					type="text"
					autocomplete="username"
					autocapitalize="none"
					spellcheck="false"
					required
					placeholder={t.handlePlaceholder}
					value={form?.handle ?? ''}
					class="field"
				/>
			</label>
			{#if error}
				<p role="alert" class="text-sm text-danger">{t.errors[error]}</p>
			{/if}
			<Button type="submit" variant="primary" size="lg" block {pending}>{t.submit}</Button>
		</form>
	</section>
	<p class="mt-4 text-center text-sm text-muted">
		{t.noAccount}
		<a href="https://nagi.suibari.com/" class="font-semibold text-accent-strong">{t.openNagi}</a>
	</p>
</main>
