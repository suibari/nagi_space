// See https://svelte.dev/docs/kit/types#app.d.ts
declare global {
	namespace App {
		interface Locals {
			/** ログイン中の利用者のDID。未ログインなら undefined */
			did?: string;
			locale: import('#lib/i18n/messages.ts').Locale;
		}
	}
}

export {};
