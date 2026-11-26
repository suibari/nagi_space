<script lang="ts">
	import { onMount } from 'svelte';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import type { SpaceConnection } from './room.svelte.ts';

	type StageState = {
		role: 'host' | 'speaker' | 'listener';
		requested: boolean;
		offer: 'approved' | 'invited' | null;
		requests: Array<{ did: string; name: string }>;
	};

	let {
		spaceId,
		connection,
		locale
	}: { spaceId: string; connection: SpaceConnection; locale: Locale } = $props();
	const t = $derived(messages[locale].space.stage);

	let stageState = $state<StageState>();
	let inviteAccepted = $state(false);
	let micDenied = $state(false);
	let error = $state<string>();
	let busy = $state(false);

	async function refresh() {
		const response = await fetch(`/s/${spaceId}/stage`);
		if (response.ok) stageState = (await response.json()) as StageState;
	}

	async function act(action: string, target?: string) {
		busy = true;
		error = undefined;
		try {
			const response = await fetch(`/s/${spaceId}/stage`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action, target })
			});
			if (!response.ok) {
				const body = (await response.json().catch(() => ({}))) as { error?: string };
				error = body.error === 'speakersFull' ? t.speakersFull : t.failed;
			}
		} finally {
			busy = false;
			await refresh();
		}
	}

	/** 字幕の案内を見せたあとでマイクの許可を求め、許可されたら受け入れる（PART-03・TRANS-02）。 */
	async function allowMicAndAccept() {
		micDenied = false;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			stream.getTracks().forEach((track) => track.stop());
		} catch {
			micDenied = true;
			return;
		}
		await act('accept');
		inviteAccepted = false;
	}

	onMount(() => {
		void refresh();
		connection.onControl = () => void refresh();
		return () => (connection.onControl = undefined);
	});

	// サーバーがロールを変えたら状態を取り直す
	$effect(() => {
		void connection.localRole;
		void refresh();
	});

	const participants = $derived(connection.participants.filter((p) => !p.isLocal));
	const showMicStep = $derived(
		stageState?.offer === 'approved' || (stageState?.offer === 'invited' && inviteAccepted)
	);
</script>

{#if stageState}
	<section class="mt-4 flex flex-col gap-2 text-sm" data-testid="stage">
		{#if stageState.role === 'listener'}
			{#if showMicStep}
				<div data-testid="mic-step">
					<p>{t.transcriptionNotice}</p>
					<button
						type="button"
						class="mt-1 rounded-full bg-black px-4 py-2 text-white"
						disabled={busy}
						onclick={allowMicAndAccept}
					>
						{t.allowMic}
					</button>
					{#if micDenied}<p role="alert" class="mt-1 text-red-700">{t.micDenied}</p>{/if}
				</div>
			{:else if stageState.offer === 'invited'}
				<div data-testid="invited">
					<p>{t.invited}</p>
					<button type="button" class="underline" onclick={() => (inviteAccepted = true)}>
						{t.acceptInvite}
					</button>
					<button
						type="button"
						class="ml-2 underline"
						disabled={busy}
						onclick={() => act('decline')}
					>
						{t.declineInvite}
					</button>
				</div>
			{:else if stageState.requested}
				<p>{t.requested}</p>
				<button
					type="button"
					class="self-start underline"
					disabled={busy}
					onclick={() => act('cancel')}
				>
					{t.cancel}
				</button>
			{:else}
				<button
					type="button"
					class="self-start rounded-full border px-4 py-2"
					disabled={busy}
					onclick={() => act('request')}
				>
					{t.request}
				</button>
			{/if}
		{:else if stageState.role === 'speaker'}
			<button
				type="button"
				class="self-start rounded-full border px-4 py-2"
				disabled={busy}
				onclick={() => act('leave')}
			>
				{t.leave}
			</button>
		{:else}
			<h3 class="font-bold">{t.requests}</h3>
			<ul class="flex flex-col gap-1" data-testid="requests">
				{#each stageState.requests as request (request.did)}
					<li data-did={request.did}>
						{request.name}
						<button
							type="button"
							class="ml-2 underline"
							disabled={busy}
							onclick={() => act('approve', request.did)}
						>
							{t.approve}
						</button>
					</li>
				{/each}
			</ul>
			<ul class="flex flex-col gap-1" data-testid="host-participants">
				{#each participants as participant (participant.identity)}
					<li data-did={participant.identity}>
						{participant.name}
						{#if participant.role === 'listener'}
							<button
								type="button"
								class="ml-2 underline"
								disabled={busy}
								onclick={() => act('invite', participant.identity)}
							>
								{t.invite}
							</button>
						{:else if participant.role === 'speaker'}
							<button
								type="button"
								class="ml-2 underline"
								disabled={busy}
								onclick={() => act('revoke', participant.identity)}
							>
								{t.revoke}
							</button>
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
		{#if error}<p role="alert" class="text-red-700" data-testid="stage-error">{error}</p>{/if}
	</section>
{/if}
