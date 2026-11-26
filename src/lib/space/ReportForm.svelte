<script lang="ts">
	import { messages, type Locale } from '#lib/i18n/messages.ts';

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

<section class="mt-2 rounded-xl border p-3 text-sm" data-testid="report-form">
	{#if result === 'sent'}
		<p role="status">{t.sent}</p>
		<button type="button" class="mt-1 underline" onclick={onclose}>{t.cancel}</button>
	{:else}
		<h3 class="font-bold">{t.title}</h3>
		<p class="mt-1">{t.lead}</p>
		<form class="mt-2 flex flex-col gap-2" onsubmit={submit}>
			<label class="flex flex-col gap-1">
				<span>{t.reason}</span>
				<select bind:value={reason} class="rounded border px-2 py-1">
					{#each REASONS as value (value)}
						<option {value}>{t.reasons[value]}</option>
					{/each}
				</select>
			</label>
			<label class="flex flex-col gap-1">
				<span>{t.comment}</span>
				<textarea bind:value={comment} rows="2" maxlength="1000" class="rounded border px-2 py-1"
				></textarea>
			</label>
			{#if result}<p role="alert" class="text-red-700">{t[result]}</p>{/if}
			<div class="flex gap-2">
				<button type="submit" class="rounded-full bg-black px-3 py-1 text-white" disabled={busy}>
					{t.submit}
				</button>
				<button type="button" class="underline" onclick={onclose}>{t.cancel}</button>
			</div>
		</form>
	{/if}
</section>
