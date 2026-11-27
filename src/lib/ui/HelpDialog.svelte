<script lang="ts">
	/**
	 * ヘルプのモーダル（HELP-01）。<dialog> の showModal() で開き、外側の操作の無効化・Esc で閉じる・
	 * フォーカスの扱いをブラウザに任せる。中身は表示だけで、Space の接続や入力には触れない。
	 */
	import { messages, type Locale } from '#lib/i18n/messages.ts';
	import Icon from './Icon.svelte';

	let { locale }: { locale: Locale } = $props();
	const t = $derived(messages[locale].help);

	let dialog: HTMLDialogElement;
	let opener: HTMLButtonElement;

	function close() {
		dialog.close();
	}
</script>

<button
	bind:this={opener}
	type="button"
	class="help-button"
	aria-label={t.open}
	title={t.open}
	aria-haspopup="dialog"
	onclick={() => dialog.showModal()}
>
	<Icon name="help" size={20} />
</button>

<!-- 外側（背景）を押したら閉じる。閉じたら開いたボタンにフォーカスを戻す -->
<dialog
	bind:this={dialog}
	class="help"
	aria-labelledby="help-title"
	data-testid="help-dialog"
	onclick={(event) => {
		if (event.target === dialog) close();
	}}
	onclose={() => opener?.focus()}
>
	<div class="panel">
		<div class="head">
			<h2 id="help-title">{t.title}</h2>
			<button type="button" class="close" aria-label={t.close} onclick={close}>
				<Icon name="x" size={18} />
			</button>
		</div>
		<ul class="items">
			{#each t.items as item (item.title)}
				<li>
					<span class="item-icon"><Icon name={item.icon as never} size={18} /></span>
					<div>
						<h3>{item.title}</h3>
						<p>{item.body}</p>
					</div>
				</li>
			{/each}
		</ul>
	</div>
</dialog>

<style>
	.help-button,
	.close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		inline-size: 36px;
		block-size: 36px;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--text-muted);
		cursor: pointer;
	}
	@media (hover: hover) and (pointer: fine) {
		.help-button:hover,
		.close:hover {
			background: var(--surface-2);
			color: var(--text);
		}
	}
	.help {
		inline-size: min(560px, calc(100vw - 32px));
		max-block-size: min(720px, calc(100dvh - 48px));
		margin: auto;
		padding: 0;
		border: 1px solid var(--line);
		border-radius: var(--radius-bubble);
		background: var(--surface-1);
		color: var(--text);
	}
	.help::backdrop {
		background: rgb(0 0 0 / 0.45);
	}
	.panel {
		padding: 20px;
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	h2 {
		color: var(--text-strong);
		font-size: 1.1rem;
		font-weight: 800;
	}
	.items {
		display: flex;
		flex-direction: column;
		gap: 16px;
		margin-block-start: 16px;
	}
	.items li {
		display: flex;
		gap: 12px;
	}
	.item-icon {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		inline-size: 36px;
		block-size: 36px;
		border-radius: var(--radius-md);
		background: var(--accent-soft);
		color: var(--accent-strong);
	}
	h3 {
		color: var(--text-strong);
		font-weight: 700;
	}
	p {
		margin-block-start: 4px;
		color: var(--text-muted);
		font-size: 0.9rem;
		line-height: 1.7;
	}
</style>
