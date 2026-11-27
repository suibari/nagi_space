<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { messages } from '#lib/i18n/messages.ts';
	import { SpaceConnection } from '#lib/space/room.svelte.ts';
	import StageControls from '#lib/space/StageControls.svelte';
	import ActionBar from '#lib/space/ActionBar.svelte';
	import ParticipantGrid from '#lib/space/ParticipantGrid.svelte';
	import { StageModel } from '#lib/space/stage.svelte.ts';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Button from '#lib/ui/Button.svelte';
	import ReportForm from '#lib/space/ReportForm.svelte';
	import Reactions from '#lib/space/Reactions.svelte';
	import Captions from '#lib/space/Captions.svelte';
	import BotControls from '#lib/space/BotControls.svelte';
	import BotAvatar from '#lib/space/BotAvatar.svelte';
	import type { PageProps } from './$types';

	const STATUS_POLL_MS = 20_000;

	let { data }: PageProps = $props();
	const t = $derived(messages[data.locale].space);
	let audioContainer: HTMLDivElement;
	let connection = $state<SpaceConnection>();
	let failed = $state(false);
	let full = $state(false);
	let banned = $state(false);
	/** 開いている通報の対象（'space' か参加者のDID） */
	let reporting = $state<string>();
	let endedByTimeLimit = $state(false);
	let emojiOpen = $state(false);
	let stage = $state<StageModel>();
	let shareState = $state<'failed' | 'retrying' | 'done' | undefined>(
		untrack(() => (data.state === 'live' && data.shareDraft ? 'failed' : undefined))
	);

	async function retryShare() {
		if (data.state !== 'live' || !data.shareDraft) return;
		shareState = 'retrying';
		const response = await fetch(`/s/${data.space.id}/share`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ text: data.shareDraft })
		});
		shareState = response.ok ? 'done' : 'failed';
	}

	type Status = { state: 'live'; hostAway: boolean } | { state: 'ended'; timeLimit: boolean };

	async function fetchStatus(): Promise<Status | undefined> {
		if (data.state !== 'live') return undefined;
		const response = await fetch(`/s/${data.space.id}/status`);
		if (!response.ok) return undefined;
		const status = (await response.json()) as Status;
		if (status.state === 'ended') endedByTimeLimit = status.timeLimit;
		return status;
	}

	onMount(() => {
		if (data.state !== 'live') return;
		const live = data;
		const current = new SpaceConnection(audioContainer);
		connection = current;
		stage = new StageModel(live.space.id, {
			speakersFull: messages[live.locale].space.stage.speakersFull,
			failed: messages[live.locale].space.stage.failed
		});
		// サーバーからの通知で発話の状態を取り直す（PART-03〜06）。ほかの部品はこの上に重ねて付ける
		const model = stage;
		current.onControl = () => void model.refresh();
		(async () => {
			const response = await fetch(`/s/${live.space.id}/token`, { method: 'POST' });
			if (response.status === 409) {
				full = true;
				return;
			}
			if (response.status === 403) {
				banned = true;
				return;
			}
			if (!response.ok) throw new Error(`token ${response.status}`);
			const { url, token } = (await response.json()) as { url: string; token: string };
			await current.connect(url, token);
		})().catch((cause) => {
			console.warn('[space] connect failed', cause);
			failed = true;
		});

		// 開催時間の上限に合わせて状態を確かめ、サーバーに終えてもらう（LIFE-09）
		const endsAt = Date.parse(live.space.startedAt) + live.maxDurationSeconds * 1000;
		const limitTimer = setTimeout(
			() => void fetchStatus(),
			Math.max(0, endsAt - Date.now()) + 2000
		);
		return () => {
			clearTimeout(limitTimer);
			void current.disconnect();
		};
	});

	// ホストがいない間は、状態を確かめ続ける（待ち時間を過ぎるとサーバーが終える。LIFE-06）
	const hostAway = $derived(
		data.state === 'live' &&
			data.role !== 'host' &&
			connection?.state === 'connected' &&
			!connection.participants.some((p) => p.identity === data.space.host.did)
	);
	$effect(() => {
		if (!hostAway) return;
		const timer = setInterval(() => void fetchStatus(), STATUS_POLL_MS);
		return () => clearInterval(timer);
	});
	// 終了で切断されたら、時間の上限で終わったかを確かめる
	$effect(() => {
		if (connection?.state === 'ended') void fetchStatus();
	});

	async function endSpace(): Promise<boolean> {
		if (data.state !== 'live') return false;
		const response = await fetch(`/s/${data.space.id}/end`, { method: 'POST' }).catch(
			() => undefined
		);
		if (!response?.ok) console.warn('[space] end failed', response?.status);
		return !!response?.ok;
	}

	async function leave() {
		await connection?.disconnect();
		await goto('/');
	}

	// サーバーがロールを変えたら取り直す
	$effect(() => {
		if (connection?.state !== 'connected') return;
		void connection.localRole;
		untrack(() => void stage?.refresh());
	});

	const onStage = $derived(
		(connection?.participants ?? []).filter(
			(p) => p.role === 'host' || p.role === 'speaker' || p.role === 'bot'
		)
	);
	const audience = $derived((connection?.participants ?? []).filter((p) => p.role === 'listener'));
	const isHost = $derived(data.state === 'live' && data.role === 'host');
	// 自分自身と botたんは通報しない。ホストには通報の操作を出さない（PART-07）
	const canReport = (p: { isLocal: boolean; role: string }) =>
		!isHost && !p.isLocal && p.role !== 'bot';
	const reportedName = $derived(
		connection?.participants.find((p) => p.identity === reporting)?.name
	);
</script>

<svelte:head>
	<title
		>{data.state === 'notFound'
			? 'Nagi Space'
			: `${data.space?.title ?? data.title} | Nagi Space`}</title
	>
</svelte:head>

<main class="space-page">
	{#if data.state === 'notFound'}
		<section class="card mt-6 p-6 text-center">
			<p data-testid="not-found">{t.notFound}</p>
			<Button href="/" class="mt-4">{t.backHome}</Button>
		</section>
	{:else if data.state === 'ended'}
		<section class="card mt-6 p-6 text-center">
			<h1 class="text-lg font-bold text-strong">{data.title}</h1>
			<p class="mt-2 text-muted" data-testid="ended">
				{data.timeLimit ? t.endedTimeLimit : t.ended}
			</p>
			<Button href="/" class="mt-4">{t.backHome}</Button>
		</section>
	{:else}
		<header class="flex flex-col gap-2">
			<h1 class="text-xl leading-snug font-bold text-strong" data-testid="space-title">
				{data.space.title}
			</h1>
			<div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
				<span class="flex items-center gap-2" data-testid="space-host">
					<Avatar
						src={data.space.host.avatar}
						name={data.space.host.displayName ?? data.space.host.handle}
						size={24}
					/>
					<span class="text-fg">{data.space.host.displayName ?? data.space.host.handle}</span>
					<span class="host-chip">{t.host}</span>
				</span>
				{#if data.state === 'live' && !banned && !full && connection}
					<span
						class="status"
						class:ok={connection.state === 'connected' && !failed}
						data-testid="connection-state"
					>
						{failed ? t.disconnected : t[connection.state]}
					</span>
				{/if}
			</div>
			{#if hostAway}
				<p class="notice" role="status" data-testid="host-away">{t.hostAway}</p>
			{/if}
			{#if shareState === 'failed' || shareState === 'retrying'}
				<div
					class="notice flex flex-wrap items-center gap-2"
					role="alert"
					data-testid="share-failed"
				>
					<p class="flex-1">{t.shareFailed}</p>
					<Button size="sm" pending={shareState === 'retrying'} onclick={retryShare}>
						{t.shareRetry}
					</Button>
				</div>
			{:else if shareState === 'done'}
				<p class="notice" role="status" data-testid="share-done">{t.shareDone}</p>
			{/if}
		</header>

		{#if data.state === 'anonymous'}
			<section class="card mt-6 flex flex-col items-start gap-3 p-5">
				<p>{t.loginLead}</p>
				<Button
					variant="primary"
					href="/login?returnTo={encodeURIComponent(`/s/${data.space.id}`)}"
				>
					{t.loginToJoin}
				</Button>
			</section>
		{:else if data.state === 'unregistered'}
			<p class="card mt-6 p-5">{t.unregistered}</p>
		{:else if banned}
			<p class="card mt-6 p-5" role="alert" data-testid="banned">{t.banned}</p>
		{:else if connection?.state === 'removed'}
			<p class="card mt-6 p-5" role="alert" data-testid="removed">{t.removed}</p>
		{:else if full}
			<p class="card mt-6 p-5" role="alert" data-testid="full">{t.full}</p>
		{:else if connection?.state === 'ended'}
			<section class="card mt-6 p-6 text-center">
				<p data-testid="ended">{endedByTimeLimit ? t.endedTimeLimit : t.ended}</p>
				<Button href="/" class="mt-4">{t.backHome}</Button>
			</section>
		{:else}
			{#if connection && !connection.canPlayAudio}
				<Button variant="primary" block class="mt-4" onclick={() => connection?.startAudio()}>
					{t.startAudio}
				</Button>
			{/if}

			{#if connection?.state === 'connected' && stage}
				<!-- 広い画面では左に3Dモデルと参加者、右に字幕とコメント（LOOK-07、design.md D10） -->
				<div class="room">
					<div class="area-bot">
						<BotAvatar {connection} base={data.botAssetsBase} locale={data.locale} />
					</div>

					<!-- 参加者の並びの入れ物はグリッドに溶かす（中の塊をそれぞれの段に置く） -->
					<div class="contents" data-testid="participants">
						<section class="area-speakers" aria-labelledby="speakers-heading">
							<h2 id="speakers-heading" class="section-title">
								{t.speakers}<span class="count">{onStage.length}</span>
							</h2>
							<ParticipantGrid
								participants={onStage}
								locale={data.locale}
								large
								{canReport}
								onreport={(id) => (reporting = id)}
							/>
						</section>

						{#if !isHost}
							<div class="area-stage">
								<StageControls {stage} {connection} locale={data.locale} />
							</div>
						{/if}

						<div class="area-captions">
							<Captions {connection} locale={data.locale} mutedDids={data.mutedDids} />
						</div>

						<section class="area-listeners" aria-labelledby="listeners-heading">
							<h2 id="listeners-heading" class="section-title">
								{t.listeners}<span class="count">{audience.length}</span>
							</h2>
							{#if audience.length}
								<ParticipantGrid
									participants={audience}
									locale={data.locale}
									{canReport}
									onreport={(id) => (reporting = id)}
								/>
							{:else}
								<p class="text-sm text-muted">{t.noListeners}</p>
							{/if}
						</section>
					</div>

					<div class="area-extra">
						{#if reporting && reporting !== 'space'}
							<div>
								<p class="mb-2 text-sm text-muted">{t.report.about(reportedName ?? '')}</p>
								<ReportForm
									spaceId={data.space.id}
									member={reporting}
									locale={data.locale}
									onclose={() => (reporting = undefined)}
								/>
							</div>
						{/if}

						{#if isHost}
							<BotControls
								spaceId={data.space.id}
								{connection}
								locale={data.locale}
								kind={data.space.kind}
							/>
							<StageControls {stage} {connection} locale={data.locale} />
						{/if}

						{#if reporting === 'space'}
							<ReportForm
								spaceId={data.space.id}
								locale={data.locale}
								onclose={() => (reporting = undefined)}
							/>
						{/if}
					</div>
				</div>

				<!-- 絵文字はロールにかかわらず送れる（REACT-01） -->
				<Reactions
					spaceId={data.space.id}
					{connection}
					locale={data.locale}
					mutedDids={data.mutedDids}
					allowComments={data.space.kind === 'public'}
					bind:open={emojiOpen}
				/>
				<ActionBar
					{connection}
					{stage}
					locale={data.locale}
					{isHost}
					bind:emojiOpen
					onreport={() => (reporting = 'space')}
					onleave={leave}
					onend={endSpace}
				/>
			{/if}
		{/if}
	{/if}
	<div bind:this={audioContainer} hidden></div>
</main>

<style>
	.space-page {
		max-inline-size: 640px;
		margin-inline: auto;
		padding: 24px 16px calc(112px + env(safe-area-inset-bottom));
	}
	.room {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 24px;
		margin-block-start: 20px;
	}
	.room > div:empty {
		display: none;
	}
	.area-extra {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}
	.area-extra:empty {
		display: none;
	}
	/* 広い画面は2段組み。右の字幕とコメントは見出しの下にとどめ、画面の高さに合わせて伸ばす（LOOK-07） */
	@media (min-width: 1024px) {
		.space-page {
			max-inline-size: 1200px;
			padding-inline: 24px;
		}
		.room {
			grid-template-columns: minmax(0, 1fr) 380px;
			grid-template-areas:
				'bot captions'
				'speakers captions'
				'stage captions'
				'listeners captions'
				'extra captions';
			grid-template-rows: auto auto auto auto 1fr;
			column-gap: 32px;
			align-items: start;
		}
		.area-bot {
			grid-area: bot;
		}
		.area-speakers {
			grid-area: speakers;
		}
		.area-stage {
			grid-area: stage;
		}
		.area-listeners {
			grid-area: listeners;
		}
		.area-extra {
			grid-area: extra;
		}
		.area-captions {
			grid-area: captions;
			position: sticky;
			inset-block-start: 72px;
			block-size: calc(100dvh - 72px - 112px);
		}
		.area-captions :global([data-testid='captions']) {
			display: flex;
			flex-direction: column;
			block-size: 100%;
		}
		.area-captions :global([data-testid='timeline']) {
			flex: 1;
			max-block-size: none;
		}
	}
	.status {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 2px 10px;
		border-radius: 999px;
		background: var(--surface-2);
		color: var(--text-muted);
		font-size: 0.78rem;
	}
	.status.ok {
		background: var(--accent-soft);
		color: var(--accent-strong);
	}
	.host-chip {
		padding: 1px 8px;
		border-radius: 999px;
		background: var(--accent-soft);
		color: var(--accent-strong);
		font-size: 0.72rem;
		font-weight: 600;
	}
	.notice {
		padding: 10px 12px;
		border-radius: var(--radius-md);
		background: var(--surface-2);
		font-size: 0.875rem;
	}
	.section-title {
		display: flex;
		align-items: baseline;
		gap: 8px;
		margin-block-end: 12px;
		color: var(--text-strong);
		font-size: 0.95rem;
		font-weight: 700;
	}
	.count {
		color: var(--text-muted);
		font-size: 0.82rem;
		font-weight: 500;
	}
</style>
