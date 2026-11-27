<script lang="ts">
	/** 画面の下に固定する操作バー（LOOK-05）。スクロールしても届く位置に、よく使う操作だけを置く。 */
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Icon from '#lib/ui/Icon.svelte';
	import BarButton from './BarButton.svelte';
	import type { SpaceConnection } from './room.svelte.ts';
	import type { StageModel } from './stage.svelte.ts';

	let {
		connection,
		stage,
		locale,
		isHost,
		emojiOpen = $bindable(false),
		onreport,
		onleave,
		onend
	}: {
		connection: SpaceConnection;
		stage: StageModel;
		locale: Locale;
		isHost: boolean;
		emojiOpen?: boolean;
		onreport: () => void;
		onleave: () => Promise<void>;
		onend: () => Promise<boolean>;
	} = $props();
	const t = $derived(messages[locale].space);

	let micPending = $state(false);
	let exitPending = $state(false);
	let micError = $state(false);

	const role = $derived(stage.state?.role ?? connection.localRole);
	const canSpeak = $derived(connection.localRole === 'host' || connection.localRole === 'speaker');

	async function toggleMic() {
		micPending = true;
		micError = false;
		try {
			await connection.setMic(!connection.micOn);
		} catch {
			micError = true;
		} finally {
			micPending = false;
		}
	}

	async function exit() {
		exitPending = true;
		try {
			if (isHost) {
				// 終了が通れば room が消え、画面は終了の表示に変わる（LIFE-05）
				if (!(await onend())) exitPending = false;
			} else {
				await onleave();
			}
		} catch {
			exitPending = false;
		}
	}
</script>

<nav class="action-bar" aria-label={t.actions} data-testid="action-bar">
	{#if micError}<p class="bar-error" role="alert">{t.micFailed}</p>{/if}
	<div class="bar-inner">
		{#if canSpeak}
			<BarButton
				label={connection.micOn ? t.micOff : t.micOn}
				short={connection.micOn ? t.short.mute : t.short.unmute}
				tone={connection.micOn ? 'accent' : 'default'}
				pending={micPending}
				onclick={toggleMic}
			>
				{#snippet icon()}<Icon name={connection.micOn ? 'mic' : 'mic-off'} />{/snippet}
			</BarButton>
		{/if}

		<BarButton
			label={t.emoji.open}
			short={t.short.emoji}
			active={emojiOpen}
			expanded={emojiOpen}
			onclick={() => (emojiOpen = !emojiOpen)}
		>
			{#snippet icon()}<Icon name="smile" />{/snippet}
		</BarButton>

		{#if role === 'listener'}
			{#if stage.state?.requested}
				<BarButton
					label={t.stage.cancel}
					short={t.short.cancel}
					active
					pending={stage.isPending('cancel')}
					onclick={() => stage.act('cancel')}
				>
					{#snippet icon()}<Icon name="hand" />{/snippet}
				</BarButton>
			{:else if stage.state && !stage.state.offer}
				<BarButton
					label={t.stage.request}
					short={t.short.request}
					pending={stage.isPending('request')}
					onclick={() => stage.act('request')}
				>
					{#snippet icon()}<Icon name="hand" />{/snippet}
				</BarButton>
			{/if}
		{:else if role === 'speaker'}
			<BarButton
				label={t.stage.leave}
				short={t.short.toListener}
				pending={stage.isPending('leave')}
				onclick={() => stage.act('leave')}
			>
				{#snippet icon()}<Icon name="headphones" />{/snippet}
			</BarButton>
		{/if}

		{#if !isHost}
			<BarButton label={t.report.space} short={t.short.report} onclick={onreport}>
				{#snippet icon()}<Icon name="flag" />{/snippet}
			</BarButton>
		{/if}

		<BarButton
			label={isHost ? t.end : t.leave}
			short={isHost ? t.short.end : t.short.leave}
			tone="danger"
			pending={exitPending}
			onclick={exit}
		>
			{#snippet icon()}<Icon name={isHost ? 'stop' : 'leave'} />{/snippet}
		</BarButton>
	</div>
</nav>

<style>
	.action-bar {
		position: fixed;
		inset-inline: 0;
		inset-block-end: 0;
		z-index: 30;
		border-block-start: 1px solid var(--line);
		background: var(--overlay);
		backdrop-filter: blur(12px);
		padding-block-end: env(safe-area-inset-bottom);
	}
	.bar-inner {
		display: flex;
		gap: 4px;
		max-inline-size: 640px;
		margin-inline: auto;
		padding: 4px 8px;
	}
	.bar-error {
		max-inline-size: 640px;
		margin: 6px auto 0;
		padding-inline: 16px;
		color: var(--danger);
		font-size: 0.82rem;
	}
</style>
