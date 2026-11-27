<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { messages } from '#lib/i18n/messages.ts';
	import Landing from '#lib/landing/Landing.svelte';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Button from '#lib/ui/Button.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { PageProps } from './$types';

	const NAGI_URL = 'https://nagi.suibari.com/';

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale]);
	let loggingOut = $state(false);

	// 一覧を見ている間に始まった・終わった Space を反映する（LIFE-03）
	onMount(() => {
		if (!data.did) return;
		const timer = setInterval(() => {
			if (document.visibilityState === 'visible') void invalidateAll();
		}, 15_000);
		return () => clearInterval(timer);
	});
</script>

<svelte:head>
	<title>Nagi Space</title>
</svelte:head>

{#if !data.did}
	<!-- 未ログインには説明を出す。開催中の Space の情報は出さない（LAND-01） -->
	<Landing locale={data.locale} />
{:else}
	<main class="mx-auto max-w-xl px-4 py-8">
		{#if data.nagiUser === 'unregistered'}
			<section class="card flex flex-col items-start gap-3 p-5" data-testid="unregistered">
				<p>{t.home.unregistered}</p>
				<Button variant="primary" href={NAGI_URL}>{t.home.openNagi}</Button>
			</section>
		{:else if data.nagiUser === 'unknown'}
			<section
				class="card flex flex-col items-start gap-3 p-5"
				role="alert"
				data-testid="registration-unknown"
			>
				<p>{t.home.unknown}</p>
				<Button onclick={() => location.reload()}>{t.home.reload}</Button>
			</section>
		{:else}
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 class="text-xl font-bold text-strong">{t.home.liveSpaces}</h1>
					<p class="mt-0.5 text-sm text-muted" data-testid="signed-in">{t.home.signedInAs}</p>
				</div>
				<Button variant="primary" href="/spaces/new">{t.home.startSpace}</Button>
			</div>
			<section class="mt-6" aria-label={t.home.liveSpaces}>
				{#if data.spaces.length === 0}
					<div class="card flex flex-col items-center gap-2 px-5 py-10 text-center">
						<span class="text-accent-strong"><Icon name="users" size={28} /></span>
						<p class="text-sm text-muted" data-testid="no-spaces">{t.home.noSpaces}</p>
					</div>
				{:else}
					<ul class="flex flex-col gap-3" data-testid="live-spaces">
						{#each data.spaces as space (space.id)}
							<li>
								<a href="/s/{space.id}" class="card space-card" data-space-id={space.id}>
									<Avatar
										src={space.host.avatar}
										name={space.host.displayName ?? space.host.handle}
										size={44}
									/>
									<span class="min-w-0 flex-1">
										<span class="block truncate font-semibold text-strong">{space.title}</span>
										<span class="block truncate text-sm text-muted">
											{space.host.displayName ?? space.host.handle}
										</span>
										<span class="mt-2 flex flex-wrap gap-2 text-xs">
											<span class="chip">{t.home.speakers(space.speakers)}</span>
											<span class="chip">{t.home.listeners(space.listeners)}</span>
											{#if space.botPresent}<span class="chip accent">
													{t.home.botPresent}
												</span>{/if}
										</span>
									</span>
								</a>
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		{/if}
		<form
			method="POST"
			action="/logout"
			class="mt-10 flex justify-center"
			use:enhance={() => {
				loggingOut = true;
				return async ({ update }) => {
					await update();
					loggingOut = false;
				};
			}}
		>
			<Button type="submit" variant="ghost" size="sm" pending={loggingOut}>{t.logout}</Button>
		</form>
	</main>
{/if}

<style>
	.space-card {
		display: flex;
		gap: 12px;
		padding: 16px;
		text-decoration: none;
		transition: border-color 0.15s ease;
	}
	@media (hover: hover) and (pointer: fine) {
		.space-card:hover {
			border-color: var(--line-strong);
		}
	}
	.chip {
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--text-muted);
	}
	.chip.accent {
		background: var(--accent-soft);
		color: var(--accent-strong);
	}
</style>
