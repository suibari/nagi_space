<script lang="ts">
	import { onMount } from 'svelte';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Button from '#lib/ui/Button.svelte';
	import type { SpaceConnection } from './room.svelte.ts';

	const POLL_MS = 5000;

	type BotState = {
		requested: boolean;
		present: boolean;
		status: 'available' | 'busy' | 'resting';
	};

	let {
		spaceId,
		connection,
		locale,
		kind = 'public'
	}: {
		spaceId: string;
		connection: SpaceConnection;
		locale: Locale;
		/** botたんSpace では外す操作を出さず、落ちたときだけ呼び直せる（BOT-01・BOT-06） */
		kind?: 'public' | 'bot';
	} = $props();
	const t = $derived(messages[locale].space.botControls);

	let botState = $state<BotState>();
	let left = $state(false);
	let pending = $state<'invite' | 'remove'>();
	let failure = $state<string>();

	async function refresh() {
		const response = await fetch(`/s/${spaceId}/bot`).catch(() => undefined);
		if (response?.ok) botState = (await response.json()) as BotState;
	}

	async function act(action: 'invite' | 'remove') {
		pending = action;
		left = false;
		failure = undefined;
		try {
			const response = await fetch(`/s/${spaceId}/bot`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action })
			}).catch(() => undefined);
			if (!response?.ok) {
				const body = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
				failure =
					body?.error === 'botBusy' ? t.busy : body?.error === 'botResting' ? t.resting : t.failed;
			}
			await refresh();
		} finally {
			pending = undefined;
		}
	}

	onMount(() => {
		void refresh();
		// 空きができたり convo に届くようになったら、招待の操作を使えるようにする（BOT-02・BOT-06）
		const timer = setInterval(() => void refresh(), POLL_MS);
		const previous = connection.onControl;
		connection.onControl = (message) => {
			previous?.(message);
			if (message.type === 'bot.left') {
				left = true;
				void refresh();
			}
		};
		return () => {
			clearInterval(timer);
			connection.onControl = previous;
		};
	});

	const inRoom = $derived(connection.botPresent);
</script>

{#if botState}
	<section class="card flex flex-col gap-2 p-4 text-sm" data-testid="bot-controls">
		{#if left}<p role="alert" data-testid="bot-left">{t.left}</p>{/if}
		<div class="flex flex-wrap items-center gap-3">
			<img src="/bot-tan-avatar.jpg" alt="" class="h-10 w-10 flex-none rounded-full object-cover" />
			<div class="min-w-0 flex-1">
				<p class="font-semibold text-strong">{t.title}</p>
				{#if !inRoom && !botState.requested}
					{#if botState.status === 'busy'}
						<p class="text-muted" data-testid="bot-busy">{t.busy}</p>
					{:else if botState.status === 'resting'}
						<p class="text-muted" data-testid="bot-resting">{t.resting}</p>
					{:else}
						<p class="text-muted">{t.hint}</p>
					{/if}
				{:else if !inRoom}
					<p class="text-muted" data-testid="bot-joining">{t.joining}</p>
				{/if}
			</div>
			{#if inRoom || botState.requested}
				{#if kind === 'public'}
					<Button size="sm" pending={pending === 'remove'} onclick={() => act('remove')}>
						{t.remove}
					</Button>
				{/if}
			{:else}
				<Button
					variant="primary"
					size="sm"
					pending={pending === 'invite'}
					disabled={botState.status !== 'available'}
					onclick={() => act('invite')}
				>
					{kind === 'bot' ? t.reinvite : t.invite}
				</Button>
			{/if}
		</div>
		{#if failure}<p role="alert" class="text-danger" data-testid="bot-failed">{failure}</p>{/if}
	</section>
{/if}
