// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			/** ログイン中の利用者のDID。未ログインなら undefined */
			did?: string;
			/** Nagi登録の状態（ACC-02）。unknown は AppView に確認できなかった */
			nagiUser: import('#lib/server/nagi.ts').NagiUserState;
			locale: import('#lib/i18n/messages.ts').Locale;
		}
	}
}

export {};
