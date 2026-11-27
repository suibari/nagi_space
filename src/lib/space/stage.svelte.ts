/**
 * 発話のリクエストと承認の状態（PART-03〜06）。本文の案内・ホストの操作と、下の操作バーの
 * 「発話をリクエスト」が同じ状態を見るので、画面ごとに1つ作って渡す。
 */
export type StageState = {
	role: 'host' | 'speaker' | 'listener';
	requested: boolean;
	offer: 'approved' | 'invited' | null;
	requests: Array<{ did: string; name: string }>;
};

export class StageModel {
	state = $state<StageState>();
	/** 応答を待っている操作（ボタンのスピナーに使う。LOOK-08）。対象ごとに分ける */
	pending = $state<string>();
	error = $state<string>();

	constructor(
		private readonly spaceId: string,
		private readonly messages: { speakersFull: string; failed: string }
	) {}

	async refresh(): Promise<void> {
		const response = await fetch(`/s/${this.spaceId}/stage`).catch(() => undefined);
		if (response?.ok) this.state = (await response.json()) as StageState;
	}

	/** 操作を送る。送っている間は pending に `action:target` を入れる。 */
	async act(action: string, target?: string): Promise<boolean> {
		this.pending = key(action, target);
		this.error = undefined;
		try {
			const response = await fetch(`/s/${this.spaceId}/stage`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action, target })
			}).catch(() => undefined);
			if (!response?.ok) {
				const body = (await response?.json().catch(() => ({}))) as { error?: string } | undefined;
				this.error =
					body?.error === 'speakersFull' ? this.messages.speakersFull : this.messages.failed;
				return false;
			}
			return true;
		} finally {
			await this.refresh();
			this.pending = undefined;
		}
	}

	isPending(action: string, target?: string): boolean {
		return this.pending === key(action, target);
	}
}

const key = (action: string, target?: string) => (target ? `${action}:${target}` : action);
