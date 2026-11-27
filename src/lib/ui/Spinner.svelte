<script lang="ts">
	/** 回転する輪。ボタンの中では装飾として使い、読み上げはボタンの aria-busy に任せる。 */
	let {
		size = 'md',
		label,
		decorative = false
	}: { size?: 'sm' | 'md'; label?: string; decorative?: boolean } = $props();
</script>

<span
	class="spinner"
	class:small={size === 'sm'}
	role={decorative ? undefined : 'status'}
	aria-label={decorative ? undefined : label}
	aria-hidden={decorative ? 'true' : undefined}
></span>

<style>
	.spinner {
		display: inline-block;
		flex: none;
		box-sizing: border-box;
		width: 24px;
		height: 24px;
		border: 3px solid color-mix(in srgb, currentColor 25%, transparent);
		border-top-color: currentColor;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}
	.small {
		width: 16px;
		height: 16px;
		border-width: 2px;
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 2.4s;
		}
	}
</style>
