<script lang="ts">
	import { onMount } from 'svelte';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import { applyTheme, readTheme, type ThemePreference } from './theme.ts';

	let { locale }: { locale: Locale } = $props();
	const t = $derived(messages[locale].settings);

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

<header class="border-b border-line bg-surface">
	<div class="mx-auto flex max-w-xl items-center justify-between px-4 py-2">
		<a href="/" class="flex items-center gap-2 font-bold text-strong">
			<img src="/icons/icon.svg" alt="" class="h-7 w-7" />
			Nagi Space
		</a>
		<button
			type="button"
			class="rounded-full px-3 py-1 text-sm hover:bg-surface-2"
			aria-expanded={open}
			onclick={() => (open = !open)}
		>
			{t.open}
		</button>
	</div>
	{#if open}
		<div class="mx-auto max-w-xl px-4 pb-3 text-sm" data-testid="settings">
			<fieldset class="mt-1">
				<legend class="font-medium">{t.theme}</legend>
				<div class="mt-1 flex flex-wrap gap-3">
					{#each ['system', 'light', 'dark'] as const as value (value)}
						<label class="flex items-center gap-1">
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
			<label class="mt-3 flex items-center gap-2">
				<span class="font-medium">{t.language}</span>
				<select
					class="rounded-md border px-2 py-1"
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
