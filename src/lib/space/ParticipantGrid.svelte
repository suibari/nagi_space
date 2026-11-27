<script lang="ts">
	/** 参加者をアイコンで並べる（LOOK-07）。話している人はアイコンの枠を光らせ、読み上げでも伝える。 */
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Icon from '#lib/ui/Icon.svelte';
	import type { ParticipantView } from './room.svelte.ts';

	let {
		participants,
		locale,
		large = false,
		canReport,
		onreport
	}: {
		participants: ParticipantView[];
		locale: Locale;
		/** スピーカーの段は大きく、聴衆の段は小さく並べる */
		large?: boolean;
		canReport: (participant: ParticipantView) => boolean;
		onreport: (identity: string) => void;
	} = $props();
	const t = $derived(messages[locale].space);
	const size = $derived(large ? 64 : 44);
</script>

<ul class="grid" class:large>
	{#each participants as participant (participant.identity)}
		<li class="tile" data-role={participant.role} data-speaking={participant.speaking}>
			<span class="ring" class:speaking={participant.speaking}>
				{#if participant.role === 'bot'}
					<img
						src="/bot-tan-icon.png"
						alt=""
						class="bot-icon"
						style:width="{size}px"
						style:height="{size}px"
					/>
				{:else}
					<Avatar src={participant.avatar} name={participant.name} {size} />
				{/if}
				{#if large && !participant.micOn && participant.role !== 'bot'}
					<span class="muted-badge" title={t.micMuted}><Icon name="mic-off" size={12} /></span>
				{/if}
			</span>
			<span class="name" class:font-bold={participant.speaking}>{participant.name}</span>
			<span class="role">
				{participant.role === 'listener' && !large ? '' : t[participant.role]}
				{#if participant.speaking}<span class="speaking-text">{t.speaking}</span>{/if}
			</span>
			{#if canReport(participant)}
				<button
					type="button"
					class="report"
					aria-label={t.report.member}
					title={t.report.member}
					onclick={() => onreport(participant.identity)}
				>
					<Icon name="flag" size={14} />
				</button>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
		gap: 12px 8px;
	}
	.large {
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 16px 8px;
	}
	.tile {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 4px;
		min-inline-size: 0;
		text-align: center;
	}
	.ring {
		position: relative;
		display: inline-flex;
		padding: 3px;
		border-radius: 50%;
		box-shadow: 0 0 0 2px transparent;
		transition: box-shadow 0.15s ease;
	}
	.speaking {
		box-shadow:
			0 0 0 3px var(--accent),
			0 0 0 7px var(--accent-soft);
	}
	/* 元の画像は縦長なので、切らずに円の中へ収める */
	.bot-icon {
		flex: none;
		box-sizing: border-box;
		padding: 10%;
		border-radius: 50%;
		background: var(--accent-soft);
		object-fit: contain;
	}
	.muted-badge {
		position: absolute;
		inset-inline-end: 0;
		inset-block-end: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		inline-size: 22px;
		block-size: 22px;
		border: 2px solid var(--bg);
		border-radius: 50%;
		background: var(--surface-3);
		color: var(--text-muted);
	}
	.name {
		max-inline-size: 100%;
		overflow: hidden;
		color: var(--text-strong);
		font-size: 0.82rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.role {
		min-block-size: 1em;
		color: var(--text-muted);
		font-size: 0.72rem;
	}
	.speaking-text {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}
	.report {
		position: absolute;
		inset-block-start: 0;
		inset-inline-end: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		inline-size: 28px;
		block-size: 28px;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
	}
	@media (hover: hover) and (pointer: fine) {
		.report {
			opacity: 0;
		}
		.tile:hover .report,
		.report:focus-visible {
			opacity: 1;
		}
		.report:hover {
			background: var(--surface-2);
			color: var(--text);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.ring {
			transition: none;
		}
	}
</style>
