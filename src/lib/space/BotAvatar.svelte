<script lang="ts">
	import { onMount } from 'svelte';
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import type { Avatar } from './avatar.ts';
	import type { SpaceConnection } from './room.svelte.ts';

	let {
		connection,
		base,
		locale
	}: { connection: SpaceConnection; base: string | undefined; locale: Locale } = $props();
	const t = $derived(messages[locale].space);

	let canvas = $state<HTMLCanvasElement>();
	let avatar: Avatar | undefined;
	let status = $state<'loading' | 'ready' | 'fallback'>('loading');
	let lastMotion = $state('');

	onMount(() => {
		connection.onBot = (raw) => {
			const message = raw as { type?: string; category?: string };
			if (message.type === 'bot.motion' && message.category) {
				lastMotion = message.category;
				avatar?.playMotion(message.category);
			}
		};
		return () => (connection.onBot = undefined);
	});

	// botたんが参加している間だけ3Dモデルを読み込む。使えなければアイコンにする（BOT-05）
	$effect(() => {
		if (!connection.botPresent || !canvas) return;
		let disposed = false;
		status = 'loading';
		(async () => {
			const { canUseWebGL, createAvatar } = await import('./avatar.ts');
			if (!base || !canUseWebGL()) {
				status = 'fallback';
				return;
			}
			const created = await createAvatar(canvas!, base);
			if (disposed) return created.dispose();
			avatar = created;
			status = 'ready';
		})().catch((cause) => {
			console.warn('[avatar] could not load', cause);
			status = 'fallback';
		});
		return () => {
			disposed = true;
			avatar?.dispose();
			avatar = undefined;
		};
	});

	// botたんの声の大きさで口を動かす
	$effect(() => {
		const track = connection.botAudio;
		if (!track || status !== 'ready') return;
		const context = new AudioContext();
		const analyser = context.createAnalyser();
		analyser.fftSize = 512;
		context.createMediaStreamSource(new MediaStream([track])).connect(analyser);
		const data = new Uint8Array(analyser.fftSize);
		let frame = 0;
		const loop = () => {
			analyser.getByteTimeDomainData(data);
			let sum = 0;
			for (const value of data) sum += ((value - 128) / 128) ** 2;
			avatar?.setMouth(Math.sqrt(sum / data.length) * 6);
			frame = requestAnimationFrame(loop);
		};
		loop();
		return () => {
			cancelAnimationFrame(frame);
			void context.close();
		};
	});
</script>

{#if connection.botPresent}
	<section
		class="mt-4 flex flex-col items-center"
		data-testid="bot-avatar"
		data-state={status}
		data-motion={lastMotion}
	>
		<canvas
			bind:this={canvas}
			class="aspect-square w-full max-w-xs"
			class:hidden={status === 'fallback'}
			aria-label={t.bot}
		></canvas>
		{#if status === 'fallback'}
			<img src="/bot-tan-icon.png" alt={t.bot} class="h-32 w-32" data-testid="bot-icon" />
		{/if}
	</section>
{/if}
