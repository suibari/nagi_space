<script lang="ts">
	/** 参加者のアイコン。画像が無いか読めなければ、表示名の頭文字を丸の中に出す（LOOK-07）。 */
	let { src, name, size = 48 }: { src?: string | null; name: string; size?: number } = $props();

	let failed = $state(false);
	const initial = $derived(Array.from(name.trim())[0]?.toUpperCase() ?? '?');
</script>

<span
	class="avatar"
	style:width="{size}px"
	style:height="{size}px"
	style:font-size="{Math.round(size * 0.42)}px"
>
	{#if src && !failed}
		<img {src} alt="" loading="lazy" onerror={() => (failed = true)} />
	{:else}
		<span aria-hidden="true" data-testid="avatar-initial">{initial}</span>
	{/if}
</span>

<style>
	.avatar {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		border-radius: 50%;
		background: var(--accent-soft);
		color: var(--accent-strong);
		font-weight: 700;
		line-height: 1;
	}
	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
</style>
