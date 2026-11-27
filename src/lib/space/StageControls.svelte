<script lang="ts">
	/**
	 * 本文に出す発話の案内とホストの操作（PART-03〜06）。発話のリクエスト・取り消し・聴衆に戻る
	 * は下の操作バー（ActionBar）に置く。
	 */
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Avatar from '#lib/ui/Avatar.svelte';
	import Button from '#lib/ui/Button.svelte';
	import type { SpaceConnection } from './room.svelte.ts';
	import type { StageModel } from './stage.svelte.ts';

	let {
		stage,
		connection,
		locale
	}: { stage: StageModel; connection: SpaceConnection; locale: Locale } = $props();
	const t = $derived(messages[locale].space.stage);

	let inviteAccepted = $state(false);
	let micDenied = $state(false);
	let micChecking = $state(false);
	let confirmKick = $state<string>();

	/** 字幕の案内を見せたあとでマイクの許可を求め、許可されたら受け入れる（PART-03・TRANS-02）。 */
	async function allowMicAndAccept() {
		micDenied = false;
		micChecking = true;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			stream.getTracks().forEach((track) => track.stop());
		} catch {
			micDenied = true;
			return;
		} finally {
			micChecking = false;
		}
		await stage.act('accept');
		inviteAccepted = false;
	}

	// botたんはモデレーションの対象にしない（招待・除外は botたんの操作で行う）
	const participants = $derived(
		connection.participants.filter((p) => !p.isLocal && p.role !== 'bot')
	);
	const current = $derived(stage.state);
	const showMicStep = $derived(
		current?.offer === 'approved' || (current?.offer === 'invited' && inviteAccepted)
	);
</script>

{#if current}
	<section class="flex flex-col gap-3 text-sm" data-testid="stage">
		{#if current.role === 'listener'}
			{#if showMicStep}
				<div class="card flex flex-col gap-3 p-4" data-testid="mic-step">
					<p>{t.transcriptionNotice}</p>
					<Button
						variant="primary"
						class="self-start"
						pending={micChecking || stage.isPending('accept')}
						onclick={allowMicAndAccept}
					>
						{t.allowMic}
					</Button>
					{#if micDenied}<p role="alert" class="text-danger">{t.micDenied}</p>{/if}
				</div>
			{:else if current.offer === 'invited'}
				<div class="card flex flex-col gap-3 p-4" data-testid="invited">
					<p class="font-semibold text-strong">{t.invited}</p>
					<div class="flex flex-wrap gap-2">
						<Button variant="primary" size="sm" onclick={() => (inviteAccepted = true)}>
							{t.acceptInvite}
						</Button>
						<Button
							size="sm"
							pending={stage.isPending('decline')}
							onclick={() => stage.act('decline')}
						>
							{t.declineInvite}
						</Button>
					</div>
				</div>
			{:else if current.requested}
				<p class="text-muted" role="status">{t.requested}</p>
			{/if}
		{:else if current.role === 'host'}
			<div class="card flex flex-col gap-4 p-4">
				<div>
					<h3 class="font-bold text-strong">{t.requests}</h3>
					<ul class="mt-2 flex flex-col gap-2" data-testid="requests">
						{#each current.requests as request (request.did)}
							<li class="flex items-center justify-between gap-2" data-did={request.did}>
								<span class="min-w-0 truncate">{request.name}</span>
								<Button
									variant="primary"
									size="sm"
									pending={stage.isPending('approve', request.did)}
									onclick={() => stage.act('approve', request.did)}
								>
									{t.approve}
								</Button>
							</li>
						{:else}
							<li class="text-muted">{t.noRequests}</li>
						{/each}
					</ul>
				</div>
				{#if participants.length}
					<div>
						<h3 class="font-bold text-strong">{t.manage}</h3>
						<ul class="mt-2 flex flex-col gap-2" data-testid="host-participants">
							{#each participants as participant (participant.identity)}
								<li class="flex flex-col gap-2" data-did={participant.identity}>
									<div class="flex flex-wrap items-center gap-2">
										<Avatar src={participant.avatar} name={participant.name} size={28} />
										<span class="min-w-0 flex-1 truncate">{participant.name}</span>
										{#if participant.role === 'listener'}
											<Button
												size="sm"
												pending={stage.isPending('invite', participant.identity)}
												onclick={() => stage.act('invite', participant.identity)}
											>
												{t.invite}
											</Button>
										{:else if participant.role === 'speaker'}
											{#if participant.micOn}
												<Button
													size="sm"
													pending={stage.isPending('mute', participant.identity)}
													onclick={() => stage.act('mute', participant.identity)}
												>
													{t.mute}
												</Button>
											{/if}
											<Button
												size="sm"
												pending={stage.isPending('revoke', participant.identity)}
												onclick={() => stage.act('revoke', participant.identity)}
											>
												{t.revoke}
											</Button>
										{/if}
										{#if confirmKick !== participant.identity}
											<Button
												variant="ghost"
												size="sm"
												onclick={() => (confirmKick = participant.identity)}
											>
												{t.kick}
											</Button>
										{/if}
									</div>
									{#if confirmKick === participant.identity}
										<div
											class="flex flex-wrap items-center gap-2 rounded-md bg-danger-soft p-3"
											data-testid="kick-confirm"
										>
											<span class="w-full">{t.kickConfirm}</span>
											<Button
												variant="danger"
												size="sm"
												pending={stage.isPending('kick', participant.identity)}
												onclick={async () => {
													await stage.act('kick', participant.identity);
													confirmKick = undefined;
												}}
											>
												{t.kick}
											</Button>
											<Button size="sm" onclick={() => (confirmKick = undefined)}>
												{t.kickCancel}
											</Button>
										</div>
									{/if}
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</div>
		{/if}
		{#if stage.error}<p role="alert" class="text-danger" data-testid="stage-error">
				{stage.error}
			</p>{/if}
	</section>
{/if}
