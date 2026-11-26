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
	home: {
		loginLink: 'ログイン',
		signedInAs: 'ログイン中',
		unregistered:
			'Nagi Space は Nagi に登録している人が使えます。Nagi でプロフィールを作るか、投稿してから戻ってきてください。',
		openNagi: 'Nagi を開く',
		unknown: 'Nagi の登録を確認できませんでした。少し待ってから再読み込みしてください。',
		reload: '再読み込み'
	}
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
	home: {
		loginLink: 'Log in',
		signedInAs: 'Logged in',
		unregistered:
			'Nagi Space is for people who use Nagi. Create a profile or post on Nagi, then come back.',
		openNagi: 'Open Nagi',
		unknown: 'Could not confirm your Nagi registration. Please wait a moment and reload.',
		reload: 'Reload'
	}
};

export const messages: Record<Locale, typeof ja> = { ja, en };

/** Accept-Language から表示言語を決める。日本語以外は英語（LOOK-06）。 */
export function detectLocale(acceptLanguage: string | null): Locale {
	const first = acceptLanguage?.split(',')[0]?.trim().toLowerCase() ?? '';
	return first.startsWith('ja') ? 'ja' : 'en';
}
