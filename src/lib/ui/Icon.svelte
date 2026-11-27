<script lang="ts">
	/** 画面で使う線のアイコン。意味は隣の文言か aria-label で伝え、アイコン自体は読み上げない。 */
	type Name =
		| 'mic'
		| 'mic-off'
		| 'smile'
		| 'hand'
		| 'flag'
		| 'leave'
		| 'stop'
		| 'x'
		| 'users'
		| 'sparkle'
		| 'shield'
		| 'headphones'
		| 'captions'
		| 'comment'
		| 'help';
	let { name, size = 20 }: { name: Name; size?: number } = $props();
</script>

<svg
	width={size}
	height={size}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
	focusable="false"
>
	{#if name === 'mic'}
		<rect x="9" y="2" width="6" height="12" rx="3" />
		<path d="M5 11a7 7 0 0 0 14 0M12 18v4" />
	{:else if name === 'mic-off'}
		<path d="M15 9.3V5a3 3 0 0 0-5.7-1.3M9 9v2a3 3 0 0 0 5.1 2.1" />
		<path d="M19 11a7 7 0 0 1-1.2 3.9M5 11a7 7 0 0 0 10.6 6M12 18v4M3 3l18 18" />
	{:else if name === 'smile'}
		<circle cx="12" cy="12" r="9" />
		<path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01" />
	{:else if name === 'hand'}
		<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8" />
		<path
			d="M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"
		/>
	{:else if name === 'flag'}
		<path d="M4 22V4M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1" />
	{:else if name === 'leave'}
		<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
	{:else if name === 'stop'}
		<rect x="5" y="5" width="14" height="14" rx="2" />
	{:else if name === 'x'}
		<path d="M18 6 6 18M6 6l12 12" />
	{:else if name === 'users'}
		<path
			d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"
		/>
		<circle cx="9" cy="7" r="4" />
	{:else if name === 'sparkle'}
		<path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
	{:else if name === 'shield'}
		<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
	{:else if name === 'headphones'}
		<path d="M3 18v-6a9 9 0 0 1 18 0v6" />
		<path
			d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"
		/>
	{:else if name === 'comment'}
		<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
	{:else if name === 'help'}
		<circle cx="12" cy="12" r="9" />
		<path d="M9.5 9.2a2.6 2.6 0 0 1 5 .9c0 1.7-2.5 2.3-2.5 3.9M12 17h.01" />
	{:else if name === 'captions'}
		<rect x="3" y="5" width="18" height="14" rx="2" />
		<path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
	{/if}
</svg>
