<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { messages } from '#lib/i18n/messages.ts';
	import { SpaceConnection } from '#lib/space/room.svelte.ts';
	import StageControls from '#lib/space/StageControls.svelte';
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

	async function endSpace() {
		if (data.state !== 'live') return;
		const response = await fetch(`/s/${data.space.id}/end`, { method: 'POST' });
		if (!response.ok) console.warn('[space] end failed', response.status);
	}

	async function leave() {
		await connection?.disconnect();
		await goto('/');
	}

	const roleLabel = (role: 'host' | 'speaker' | 'listener' | 'bot') => t[role];
	// ロールは入室後にサーバーが変える（PART-03）ので、接続から読む
	const canSpeak = $derived(
		connection?.localRole === 'host' || connection?.localRole === 'speaker'
	);
</script>

<svelte:head>
	<title
		>{data.state === 'notFound'
			? 'Nagi Space'
			: `${data.space?.title ?? data.title} | Nagi Space`}</title
	>
</svelte:head>

<main class="mx-auto max-w-xl px-4 py-8">
	{#if data.state === 'notFound'}
		<p data-testid="not-found">{t.notFound}</p>
	{:else if data.state === 'ended'}
		<h1 class="text-xl font-bold">{data.title}</h1>
		<p class="mt-2" data-testid="ended">{data.timeLimit ? t.endedTimeLimit : t.ended}</p>
	{:else}
		<h1 class="text-xl font-bold" data-testid="space-title">{data.space.title}</h1>
		<p class="mt-1 text-sm">
			{t.host}: {data.space.host.displayName ?? data.space.host.handle}
		</p>

		{#if data.state === 'anonymous'}
			<a
				href="/login?returnTo={encodeURIComponent(`/s/${data.space.id}`)}"
				class="mt-6 inline-block rounded-full bg-black px-4 py-2 text-white"
			>
				{t.loginToJoin}
			</a>
		{:else if data.state === 'unregistered'}
			<p class="mt-6">{t.unregistered}</p>
		{:else if banned}
			<p class="mt-6" role="alert" data-testid="banned">{t.banned}</p>
		{:else if connection?.state === 'removed'}
			<p class="mt-6" role="alert" data-testid="removed">{t.removed}</p>
		{:else if full}
			<p class="mt-6" role="alert" data-testid="full">{t.full}</p>
		{:else if connection?.state === 'ended'}
			<p class="mt-6" data-testid="ended">{endedByTimeLimit ? t.endedTimeLimit : t.ended}</p>
		{:else}
			<p class="mt-4 text-sm" data-testid="connection-state">
				{failed ? t.disconnected : t[connection?.state ?? 'connecting']}
			</p>
			{#if shareState === 'failed' || shareState === 'retrying'}
				<div class="mt-2 text-sm" role="alert" data-testid="share-failed">
					<p>{t.shareFailed}</p>
					<button
						type="button"
						class="mt-1 underline"
						disabled={shareState === 'retrying'}
						onclick={retryShare}
					>
						{t.shareRetry}
					</button>
				</div>
			{:else if shareState === 'done'}
				<p class="mt-2 text-sm" role="status" data-testid="share-done">{t.shareDone}</p>
			{/if}
			{#if hostAway}
				<p class="mt-2 text-sm" role="status" data-testid="host-away">{t.hostAway}</p>
			{/if}

			{#if connection && !connection.canPlayAudio}
				<button
					type="button"
					class="mt-4 rounded-full border px-4 py-2"
					onclick={() => connection?.startAudio()}
				>
					{t.startAudio}
				</button>
			{/if}

			<div class="mt-4 flex flex-wrap gap-2">
				{#if canSpeak && connection?.state === 'connected'}
					<button
						type="button"
						class="rounded-full bg-black px-4 py-2 text-white"
						onclick={() => connection?.setMic(!connection.micOn)}
					>
						{connection.micOn ? t.micOff : t.micOn}
					</button>
				{/if}
				{#if data.role === 'host'}
					<!-- ホストの退室は終了と同じ（LIFE-06） -->
					<button type="button" class="rounded-full border px-4 py-2" onclick={endSpace}>
						{t.end}
					</button>
				{:else}
					<button type="button" class="rounded-full border px-4 py-2" onclick={leave}>
						{t.leave}
					</button>
				{/if}
			</div>

			{#if connection?.state === 'connected'}
				<BotAvatar {connection} base={data.botAssetsBase} locale={data.locale} />
				<!-- 絵文字はロールにかかわらず送れる（REACT-01） -->
				<Reactions
					spaceId={data.space.id}
					{connection}
					locale={data.locale}
					mutedDids={data.mutedDids}
				/>
				{#if data.role === 'host'}
					<BotControls spaceId={data.space.id} {connection} locale={data.locale} />
				{/if}
				<StageControls spaceId={data.space.id} {connection} locale={data.locale} />
				<Captions {connection} locale={data.locale} />
			{/if}

			{#if data.role !== 'host'}
				<button type="button" class="mt-4 text-xs underline" onclick={() => (reporting = 'space')}>
					{t.report.space}
				</button>
				{#if reporting === 'space'}
					<ReportForm
						spaceId={data.space.id}
						locale={data.locale}
						onclose={() => (reporting = undefined)}
					/>
				{/if}
			{/if}

			<h2 class="mt-8 font-bold">{t.participants}</h2>
			<ul class="mt-2 flex flex-col gap-2" data-testid="participants">
				{#each connection?.participants ?? [] as participant (participant.identity)}
					<li class="flex flex-wrap items-center gap-2" data-role={participant.role}>
						<span class:font-bold={participant.speaking}>{participant.name}</span>
						<span class="text-xs">{roleLabel(participant.role)}</span>
						{#if participant.speaking}<span class="text-xs">{t.speaking}</span>{/if}
						{#if !participant.isLocal && participant.role !== 'bot'}
							<button
								type="button"
								class="text-xs underline"
								onclick={() => (reporting = participant.identity)}
							>
								{t.report.member}
							</button>
						{/if}
						{#if reporting === participant.identity}
							<ReportForm
								spaceId={data.space.id}
								member={participant.identity}
								locale={data.locale}
								onclose={() => (reporting = undefined)}
							/>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
	<div bind:this={audioContainer} hidden></div>
</main>
