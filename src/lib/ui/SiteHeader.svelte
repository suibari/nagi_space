<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Button from './Button.svelte';
	import HelpDialog from './HelpDialog.svelte';
	import { applyTheme, readTheme, type ThemePreference } from './theme.ts';

	let { locale, signedIn }: { locale: Locale; signedIn: boolean } = $props();
	const t = $derived(messages[locale].settings);
	const loginLabel = $derived(messages[locale].home.loginLink);

	let open = $state(false);
	let theme = $state<ThemePreference>('system');

	onMount(() => {
		theme = readTheme();
	});

	function chooseTheme(value: ThemePreference) {
		theme = value;
		applyTheme(value);
	}

	async function chooseLocale(value: Locale) {
		if (value === locale) return;
		await fetch('/settings/locale', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ locale: value })
		});
		location.reload();
	}
</script>

<header class="site-header">
	<div class="bar">
		<a href="/" class="brand">
			<img src="/icons/icon.svg" alt="" class="h-8 w-8" />
			<span>Nagi Space</span>
		</a>
		<div class="flex items-center gap-1">
			<HelpDialog {locale} />
			{#if !signedIn && page.url.pathname !== '/login'}
				<Button href="/login" variant="ghost" size="sm">{loginLabel}</Button>
			{/if}
			<Button variant="ghost" size="sm" aria-expanded={open} onclick={() => (open = !open)}>
				{t.open}
			</Button>
		</div>
	</div>
	{#if open}
		<div class="settings" data-testid="settings">
			<fieldset>
				<legend class="text-sm font-semibold">{t.theme}</legend>
				<div class="mt-2 flex flex-wrap gap-2">
					{#each ['system', 'light', 'dark'] as const as value (value)}
						<label class="option" class:selected={theme === value}>
							<input
								type="radio"
								name="theme"
								checked={theme === value}
								onchange={() => chooseTheme(value)}
							/>
							{t[value]}
						</label>
					{/each}
				</div>
			</fieldset>
			<label class="mt-4 flex flex-wrap items-center gap-3">
				<span class="text-sm font-semibold">{t.language}</span>
				<select
					class="field w-auto"
					value={locale}
					onchange={(e) => chooseLocale(e.currentTarget.value as Locale)}
				>
					<option value="ja">日本語</option>
					<option value="en">English</option>
				</select>
			</label>
		</div>
	{/if}
</header>

<style>
	.site-header {
		position: sticky;
		inset-block-start: 0;
		z-index: 40;
		border-block-end: 1px solid var(--line);
		background: var(--overlay);
		backdrop-filter: blur(12px);
	}
	.bar,
	.settings {
		max-inline-size: 960px;
		margin-inline: auto;
		padding-inline: 16px;
	}
	/* 広い画面では Space画面の2段組み（1200px）と端をそろえる */
	@media (min-width: 1024px) {
		.bar,
		.settings {
			max-inline-size: 1200px;
			padding-inline: 24px;
		}
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		min-block-size: 56px;
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--text-strong);
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: 0.02em;
		text-decoration: none;
	}
	.settings {
		padding-block: 4px 16px;
	}
	.option {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		border: 1px solid var(--line);
		border-radius: 999px;
		font-size: 0.875rem;
		cursor: pointer;
	}
	.option input {
		accent-color: var(--accent-strong);
	}
	.option.selected {
		border-color: var(--accent-strong);
		color: var(--accent-strong);
	}
</style>
