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
	newSpace: {
		title: 'Space を始める',
		titleLabel: 'タイトル',
		kindLabel: '種類',
		kindPublic: 'パブリックSpace',
		kindPublicHint: '一覧に出て、Nagi の人なら誰でも聴きに来られます。',
		kindBot: 'botたんSpace',
		kindBotHint: 'あなたと botたんだけで話します。ほかの人には見えません。',
		submit: '開始する',
		errors: {
			empty: 'タイトルを入力してください。',
			tooLong: 'タイトルが長すぎます。',
			kind: '種類を選んでください。',
			botBusy: 'botたんは今いっぱいです。少し待ってからお試しください。',
			roomFailed: 'Space を開始できませんでした。もう一度お試しください。'
		},
		active: '開催中の Space があります。',
		backToActive: '開催中の Space に戻る'
	},
	space: {
		host: 'ホスト',
		speaker: 'スピーカー',
		listener: '聴衆',
		connecting: '接続しています…',
		connected: '接続しました',
		disconnected: '接続が切れました',
		micOn: 'マイクをオンにする',
		micOff: 'ミュートする',
		participants: '参加者',
		notFound: 'この Space は見つかりませんでした。',
		ended: 'この Space は終了しました。',
		loginToJoin: 'ログインして参加する',
		unregistered: 'Nagi に登録すると、この Space に入れます。',
		startAudio: 'タップして音声を聞く',
		end: 'Space を終了する',
		speaking: '話しています'
	},
	home: {
		loginLink: 'ログイン',
		signedInAs: 'ログイン中',
		startSpace: 'Space を始める',
		liveSpaces: '開催中の Space',
		noSpaces: 'いま開催中の Space はありません。',
		speakers: (n: number) => `スピーカー ${n}人`,
		listeners: (n: number) => `聴いている人 ${n}人`,
		botPresent: 'botたん参加中',
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
	newSpace: {
		title: 'Start a Space',
		titleLabel: 'Title',
		kindLabel: 'Type',
		kindPublic: 'Public Space',
		kindPublicHint: 'Listed for everyone on Nagi to come and listen.',
		kindBot: 'bot-tan Space',
		kindBotHint: 'Just you and bot-tan. Nobody else can see it.',
		submit: 'Start',
		errors: {
			empty: 'Enter a title.',
			tooLong: 'The title is too long.',
			kind: 'Choose a type.',
			botBusy: 'bot-tan is busy right now. Please try again in a moment.',
			roomFailed: 'Could not start the Space. Please try again.'
		},
		active: 'You already have a live Space.',
		backToActive: 'Back to your Space'
	},
	space: {
		host: 'Host',
		speaker: 'Speaker',
		listener: 'Listener',
		connecting: 'Connecting…',
		connected: 'Connected',
		disconnected: 'Disconnected',
		micOn: 'Turn on mic',
		micOff: 'Mute',
		participants: 'Participants',
		notFound: 'This Space could not be found.',
		ended: 'This Space has ended.',
		loginToJoin: 'Log in to join',
		unregistered: 'Join Nagi to enter this Space.',
		startAudio: 'Tap to hear audio',
		end: 'End Space',
		speaking: 'Speaking'
	},
	home: {
		loginLink: 'Log in',
		signedInAs: 'Logged in',
		startSpace: 'Start a Space',
		liveSpaces: 'Live Spaces',
		noSpaces: 'No Spaces are live right now.',
		speakers: (n: number) => `${n} speaking`,
		listeners: (n: number) => `${n} listening`,
		botPresent: 'bot-tan is here',
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
