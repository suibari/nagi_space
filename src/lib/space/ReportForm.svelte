<script lang="ts">
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Button from '#lib/ui/Button.svelte';

	const REASONS = ['spam', 'harassment', 'sensitive', 'botResponse', 'other'] as const;

	let {
		spaceId,
		member,
		locale,
		onclose
	}: { spaceId: string; member?: string; locale: Locale; onclose: () => void } = $props();
	const t = $derived(messages[locale].space.report);

	let reason = $state<(typeof REASONS)[number]>('harassment');
	let comment = $state('');
	let result = $state<'sent' | 'failed' | 'rateLimited'>();
	let busy = $state(false);

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		busy = true;
		const response = await fetch(`/s/${spaceId}/report`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ reason, comment, member })
		}).catch(() => undefined);
		busy = false;
		result = response?.ok ? 'sent' : response?.status === 429 ? 'rateLimited' : 'failed';
	}
</script>

<section class="card flex flex-col gap-3 p-4 text-sm" data-testid="report-form">
	{#if result === 'sent'}
		<p role="status">{t.sent}</p>
		<Button size="sm" class="self-start" onclick={onclose}>{t.close}</Button>
	{:else}
		<div>
			<h3 class="font-bold text-strong">{t.title}</h3>
			<p class="mt-1 text-muted">{t.lead}</p>
		</div>
		<form class="flex flex-col gap-3" onsubmit={submit}>
			<label class="flex flex-col gap-1">
				<span class="font-medium">{t.reason}</span>
				<select bind:value={reason} class="field">
					{#each REASONS as value (value)}
						<option {value}>{t.reasons[value]}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span class="font-medium">{t.comment}</span>
				<textarea bind:value={comment} rows="3" maxlength="1000" class="field"></textarea>
			</label>
			{#if result}<p role="alert" class="text-danger">{t[result]}</p>{/if}
			<div class="flex flex-wrap gap-2">
				<Button type="submit" variant="primary" size="sm" pending={busy}>{t.submit}</Button>
				<Button size="sm" onclick={onclose}>{t.cancel}</Button>
			</div>
		</form>
	{/if}
</section>
