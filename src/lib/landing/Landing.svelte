<script lang="ts">
	/**
	 * ログインしていない人に見せる紹介（LAND-01・LAND-02）。言葉を並べるより、Space の様子を1つ
	 * 見せる。見本の絵は静的なもので、実際の Space の情報は出さない。
	 */
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Button from '#lib/ui/Button.svelte';
	import Icon from '#lib/ui/Icon.svelte';

	const NAGI_URL = 'https://nagi.suibari.com/';

	let { locale }: { locale: Locale } = $props();
	const t = $derived(messages[locale].landing);
	const featureIcons = ['users', 'smile', 'sparkle'] as const;
	const sampleSpeakers = [
		{ name: 'Mio', speaking: true },
		{ name: 'Ren', speaking: false },
		{ name: 'Sora', speaking: false }
	];
	const sampleEmoji = ['🎉', '👏', '🥰'];
</script>

<div class="landing">
	<section class="hero">
		<div class="hero-copy">
			<p class="eyebrow">{t.eyebrow}</p>
			<h1 class="title">{t.title}</h1>
			<p class="lead">{t.lead}</p>
			<div class="actions">
				<Button variant="primary" size="lg" href="/login">{t.start}</Button>
			</div>
			<p class="nagi-link">
				{t.noAccount} <a href={NAGI_URL}>{t.openNagi}</a>
			</p>
		</div>

		<figure class="sample" aria-label={t.sampleAlt}>
			<div class="sample-head">
				<span class="sample-title">{t.sampleTitle}</span>
				<span class="live-dot" aria-hidden="true"></span>
			</div>
			<div class="sample-bot">
				<img src="/bot-tan-icon.png" alt="" />
			</div>
			<ul class="sample-speakers" aria-hidden="true">
				{#each sampleSpeakers as speaker (speaker.name)}
					<li class:speaking={speaker.speaking}>
						<Avatar name={speaker.name} size={40} />
					</li>
				{/each}
			</ul>
			<div class="sample-emoji" aria-hidden="true">
				{#each sampleEmoji as emoji, i (emoji)}
					<span style:animation-delay="{i * 1.1}s" style:left="{20 + i * 28}%">{emoji}</span>
				{/each}
			</div>
		</figure>
	</section>

	<section class="block">
		<h2 class="block-title">{t.featuresTitle}</h2>
		<ul class="features">
			{#each t.features as feature, i (feature.title)}
				<li class="card feature">
					<span class="feature-icon"><Icon name={featureIcons[i]} /></span>
					<h3>{feature.title}</h3>
					<p>{feature.body}</p>
				</li>
			{/each}
		</ul>
	</section>

	<section class="block">
		<h2 class="block-title">{t.safetyTitle}</h2>
		<ul class="safety">
			{#each t.safety as item (item.title)}
				<li>
					<span class="safety-icon"><Icon name="shield" size={18} /></span>
					<div>
						<h3>{item.title}</h3>
						<p>{item.body}</p>
					</div>
				</li>
			{/each}
		</ul>
	</section>

	<section class="closing card">
		<p>{t.closing}</p>
		<Button variant="primary" size="lg" href="/login">{t.start}</Button>
	</section>
</div>

<style>
	.landing {
		display: flex;
		flex-direction: column;
		gap: 56px;
		max-inline-size: 960px;
		margin-inline: auto;
		padding: 40px 16px 64px;
	}
	.hero {
		display: grid;
		gap: 32px;
		align-items: center;
	}
	@media (min-width: 768px) {
		.hero {
			grid-template-columns: 1.1fr 0.9fr;
			gap: 48px;
		}
	}
	.eyebrow {
		color: var(--accent-strong);
		font-size: 0.85rem;
		font-weight: 700;
	}
	.title {
		margin-block-start: 8px;
		color: var(--text-strong);
		font-size: clamp(1.6rem, 5vw, 2.25rem);
		font-weight: 800;
		line-height: 1.3;
		text-wrap: balance;
	}
	.lead {
		margin-block-start: 16px;
		color: var(--text);
		line-height: 1.8;
	}
	.actions {
		margin-block-start: 24px;
	}
	.nagi-link {
		margin-block-start: 12px;
		color: var(--text-muted);
		font-size: 0.875rem;
	}
	.nagi-link a {
		color: var(--accent-strong);
		font-weight: 600;
	}

	.sample {
		position: relative;
		display: flex;
		flex-direction: column;
		gap: 16px;
		padding: 16px;
		border: 1px solid var(--line);
		border-radius: var(--radius-bubble);
		background: var(--surface-1);
		overflow: hidden;
	}
	.sample-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.sample-title {
		color: var(--text-strong);
		font-weight: 700;
	}
	.live-dot {
		inline-size: 8px;
		block-size: 8px;
		border-radius: 50%;
		background: var(--accent);
	}
	.sample-bot {
		display: flex;
		align-items: center;
		justify-content: center;
		aspect-ratio: 5 / 4;
		border-radius: var(--radius-md);
		background: var(--surface-2);
	}
	.sample-bot img {
		inline-size: 46%;
		block-size: auto;
		aspect-ratio: 1;
		padding: 5%;
		border-radius: 50%;
		background: var(--accent-soft);
		object-fit: contain;
	}
	.sample-speakers {
		display: flex;
		justify-content: center;
		gap: 16px;
	}
	.sample-speakers li {
		display: inline-flex;
		padding: 3px;
		border-radius: 50%;
	}
	.sample-speakers .speaking {
		box-shadow:
			0 0 0 3px var(--accent),
			0 0 0 7px var(--accent-soft);
	}
	.sample-emoji span {
		position: absolute;
		inset-block-end: 96px;
		font-size: 36px;
		opacity: 0;
		animation: float 3.3s ease-out infinite;
	}
	@keyframes float {
		0% {
			transform: translateY(0) scale(0.7);
			opacity: 0;
		}
		15% {
			opacity: 1;
		}
		100% {
			transform: translateY(-160px) scale(1);
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.sample-emoji span {
			animation: none;
			opacity: 1;
			inset-block-end: 120px;
		}
	}

	.block-title {
		color: var(--text-strong);
		font-size: 1.25rem;
		font-weight: 800;
	}
	.features {
		display: grid;
		gap: 12px;
		margin-block-start: 16px;
	}
	@media (min-width: 768px) {
		.features {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.feature {
		padding: 20px;
	}
	.feature-icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 40px;
		block-size: 40px;
		border-radius: var(--radius-md);
		background: var(--accent-soft);
		color: var(--accent-strong);
	}
	.feature h3,
	.safety h3 {
		margin-block-start: 12px;
		color: var(--text-strong);
		font-weight: 700;
	}
	.feature p,
	.safety p {
		margin-block-start: 6px;
		color: var(--text-muted);
		font-size: 0.9rem;
		line-height: 1.7;
	}
	.safety {
		display: grid;
		gap: 16px;
		margin-block-start: 16px;
	}
	@media (min-width: 768px) {
		.safety {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	.safety li {
		display: flex;
		gap: 12px;
	}
	.safety h3 {
		margin-block-start: 0;
	}
	.safety-icon {
		flex: none;
		margin-block-start: 2px;
		color: var(--accent-strong);
	}
	.closing {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 32px 16px;
		text-align: center;
	}
	.closing p {
		color: var(--text-strong);
		font-size: 1.1rem;
		font-weight: 700;
	}
</style>
