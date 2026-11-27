<script lang="ts">
	/**
	 * 文字付きの操作ボタン。使い分けは Nagi 本体の Button と同じ。
	 * - primary：その画面でいちばん進めたい操作（1画面に1つを目安）
	 * - secondary：並ぶ控えの操作
	 * - ghost：密な場所の軽い操作
	 * - danger：取り消せない確定
	 * pending の間はスピナーを重ね、二重に押せないようにする（LOOK-08）。
	 */
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { page } from '$app/state';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Spinner from './Spinner.svelte';

	type Props = {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		block?: boolean;
		href?: string;
		pending?: boolean;
		children: Snippet;
	} & Omit<HTMLButtonAttributes, 'children'> &
		Omit<HTMLAnchorAttributes, 'children'>;

	let {
		variant = 'secondary',
		size = 'md',
		block = false,
		href,
		pending = false,
		class: className,
		type = 'button',
		disabled,
		children,
		...rest
	}: Props = $props();

	const busyLabel = $derived(
		messages[((page.data as { locale?: Locale }).locale ?? 'ja') as Locale].common.busy
	);
	const classes = $derived([
		'btn',
		`btn-${variant}`,
		size !== 'md' && `btn-${size}`,
		block && 'btn-block',
		className
	]);
</script>

{#if href}
	<a {href} class={classes} {...rest as HTMLAnchorAttributes}>{@render children()}</a>
{:else}
	<button
		{type}
		class={classes}
		disabled={disabled || pending}
		aria-busy={pending ? 'true' : undefined}
		{...rest as HTMLButtonAttributes}
	>
		<!-- 文言は見えなくしても幅と読み上げの名前を保つ -->
		<span class="label" class:hidden-label={pending}>{@render children()}</span>
		{#if pending}
			<span class="overlay"><Spinner size="sm" decorative /></span>
			<span class="busy-text">{busyLabel}</span>
		{/if}
	</button>
{/if}

<style>
	.label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.hidden-label {
		opacity: 0;
	}
	/* 読み上げにだけ伝える（ボタンの幅を変えない） */
	.busy-text {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
