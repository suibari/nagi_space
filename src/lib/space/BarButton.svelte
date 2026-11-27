<script lang="ts">
	/** 操作バーのボタン。アイコンの下に短い文言を出し、読み上げには label の全文を渡す（LOOK-05・08）。 */
	import type { Snippet } from 'svelte';
	import Spinner from '#lib/ui/Spinner.svelte';

	let {
		label,
		short,
		pending = false,
		active = false,
		tone = 'default',
		disabled = false,
		expanded,
		onclick,
		icon
	}: {
		label: string;
		short: string;
		pending?: boolean;
		active?: boolean;
		tone?: 'default' | 'accent' | 'danger';
		disabled?: boolean;
		expanded?: boolean;
		onclick: () => void;
		icon: Snippet;
	} = $props();
</script>

<button
	type="button"
	class="bar-btn"
	class:active
	class:accent={tone === 'accent'}
	class:danger={tone === 'danger'}
	aria-label={label}
	aria-busy={pending ? 'true' : undefined}
	aria-expanded={expanded}
	disabled={disabled || pending}
	{onclick}
>
	<span class="icon">
		{#if pending}<Spinner size="sm" decorative />{:else}{@render icon()}{/if}
	</span>
	<span class="short" aria-hidden="true">{short}</span>
</button>

<style>
	.bar-btn {
		display: flex;
		flex: 1 1 0;
		min-inline-size: 0;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		min-block-size: 56px;
		padding: 6px 4px;
		border: 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--text-muted);
		font: inherit;
		font-size: 0.72rem;
		font-weight: 600;
		line-height: 1.2;
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}
	.icon {
		display: flex;
		align-items: center;
		justify-content: center;
		inline-size: 40px;
		block-size: 32px;
		border-radius: 999px;
	}
	.short {
		max-inline-size: 100%;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.active,
	.accent {
		color: var(--accent-strong);
	}
	.accent .icon {
		background: var(--accent);
		color: var(--text-on-accent);
	}
	.active .icon {
		background: var(--accent-soft);
	}
	.danger {
		color: var(--danger);
	}
	.bar-btn:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}
	.bar-btn[aria-busy='true'] {
		opacity: 1;
		cursor: progress;
	}
	@media (hover: hover) and (pointer: fine) {
		.bar-btn:hover:not(:disabled) {
			background: var(--surface-2);
			color: var(--text);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.bar-btn {
			transition: none;
		}
	}
</style>
