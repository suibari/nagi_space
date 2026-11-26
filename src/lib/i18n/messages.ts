export type Locale = 'ja' | 'en';

const ja = {
	login: {
		title: 'ログイン',
		lead: 'Nagi のアカウント（AT Protocol のハンドル）でログインします。',
		handleLabel: 'ハンドル',
		handlePlaceholder: 'example.bsky.social',
		submit: 'ログイン',
		errors: {
			handle: 'ハンドルを入力してください。',
			authorize: 'このハンドルではログインを始められませんでした。綴りを確かめてください。',
			callback: 'ログインを完了できませんでした。もう一度お試しください。'
		}
	},
	logout: 'ログアウト',
	home: { loginLink: 'ログイン', signedInAs: 'ログイン中' }
};

const en: typeof ja = {
	login: {
		title: 'Log in',
		lead: 'Log in with your Nagi account (AT Protocol handle).',
		handleLabel: 'Handle',
		handlePlaceholder: 'example.bsky.social',
		submit: 'Log in',
		errors: {
			handle: 'Enter your handle.',
			authorize: 'Could not start logging in with this handle. Check the spelling.',
			callback: 'Could not finish logging in. Please try again.'
		}
	},
	logout: 'Log out',
	home: { loginLink: 'Log in', signedInAs: 'Logged in' }
};

export const messages: Record<Locale, typeof ja> = { ja, en };

/** Accept-Language から表示言語を決める。日本語以外は英語（LOOK-06）。 */
export function detectLocale(acceptLanguage: string | null): Locale {
	const first = acceptLanguage?.split(',')[0]?.trim().toLowerCase() ?? '';
	return first.startsWith('ja') ? 'ja' : 'en';
}
