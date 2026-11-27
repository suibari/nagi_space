export type Locale = 'ja' | 'en';

const ja = {
	common: {
		busy: '処理中'
	},
	settings: {
		open: '表示の設定',
		theme: 'テーマ',
		system: '端末の設定に合わせる',
		light: 'ライト',
		dark: 'ダーク',
		language: '表示言語',
		close: '閉じる'
	},
	login: {
		title: 'ログイン',
		lead: 'Nagi のアカウント（AT Protocol のハンドル）でログインします。',
		handleLabel: 'ハンドル',
		handlePlaceholder: 'example.bsky.social',
		submit: 'ログイン',
		noAccount: 'Nagi のアカウントをお持ちでないかたは',
		openNagi: 'Nagi へ',
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
		cancel: 'キャンセル',
		share: 'Nagi にシェアする',
		shareHint: 'あなたの Nagi に、この Space のリンクカード付きで投稿します。',
		shareTextLabel: '投稿する文章',
		shareDefault: (title: string) => `「${title}」の Space を始めました！`,
		errors: {
			empty: 'タイトルを入力してください。',
			tooLong: 'タイトルが長すぎます。',
			kind: '種類を選んでください。',
			botBusy: 'botたんは今いっぱいです。少し待ってからお試しください。',
			botResting: 'botたんは今お休み中です。しばらくしてからお試しください。',
			roomFailed: 'Space を開始できませんでした。もう一度お試しください。',
			notAllowed: 'Space を始められるのは、いまは一部の人だけです。',
			shareEmpty: '投稿する文章を入力してください。',
			shareTooLong: '投稿する文章が長すぎます。'
		},
		notAllowed: 'Space を始められるのは、いまは一部の人だけです。もうしばらくお待ちください。',
		active: '開催中の Space があります。',
		backToActive: '開催中の Space に戻る'
	},
	space: {
		backHome: 'トップへ戻る',
		noListeners: 'まだ聴いている人はいません。',
		loginLead: 'Nagi のアカウントでログインすると、この Space を聴いたり話したりできます。',
		botLoading: 'botたんを読み込んでいます',
		micMuted: 'マイクはオフ',
		speakers: 'スピーカー',
		listeners: '聴いている人',
		actions: 'Space の操作',
		micFailed: 'マイクを切り替えられませんでした。もう一度お試しください。',
		short: {
			unmute: 'マイク',
			mute: 'ミュート',
			emoji: '絵文字',
			request: 'リクエスト',
			cancel: '取り消す',
			toListener: '聴衆に戻る',
			report: '通報',
			leave: '退室',
			end: '終了'
		},
		host: 'ホスト',
		speaker: 'スピーカー',
		listener: '聴衆',
		connecting: '接続しています…',
		reconnecting: '再接続しています…',
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
		shareFailed: 'Nagi へのシェアに失敗しました。Space は続いています。',
		stage: {
			request: '発話をリクエスト',
			cancel: 'リクエストを取り消す',
			requested: 'ホストの承認を待っています。',
			invited: 'スピーカーに招待されました。',
			acceptInvite: '受け入れる',
			declineInvite: '断る',
			transcriptionNotice: 'スピーカーの発話は、字幕として入室者全員に表示されます。',
			allowMic: 'マイクを許可してスピーカーになる',
			micDenied: 'スピーカーになるには、マイクの許可が必要です。',
			leave: '聴衆に戻る',
			requests: '発話のリクエスト',
			noRequests: 'いまリクエストはありません。',
			manage: '参加者の管理',
			approve: '承認する',
			invite: '招待する',
			revoke: '聴衆に戻す',
			speakersFull: 'スピーカーが上限に達しています。',
			mute: 'ミュートする',
			kick: '退室させる',
			kickConfirm: 'この Space から退室させ、再入室も禁止します。',
			kickCancel: 'やめる',
			failed: '操作できませんでした。もう一度お試しください。'
		},
		shareRetry: 'もう一度シェアする',
		shareDone: 'Nagi にシェアしました。',
		leave: '退室する',
		hostAway: 'ホストの再接続を待っています',
		full: 'この Space は満員です。',
		removed: 'ホストによって退室させられました。この Space には入り直せません。',
		bot: 'botたん',
		botControls: {
			title: 'botたん',
			hint: 'ホストはいつでも会話に呼べます。',
			failed: 'botたんを呼べませんでした。もう一度お試しください。',
			invite: 'botたんを呼ぶ',
			remove: 'botたんに抜けてもらう',
			busy: 'botたんは今いっぱいです。空いたら呼べます。',
			resting: 'botたんは今お休み中です。戻ってきたら呼べます。',
			joining: 'botたんを呼んでいます…',
			left: 'botたんとの接続が切れたため、botたんは退出しました。もう一度呼べます。'
		},
		captions: {
			title: '字幕',
			notice: 'ホストとスピーカーの発話は、字幕として入室者全員に表示されます。',
			paused: '字幕は一時停止中です。',
			empty: 'まだ字幕はありません。',
			separator: '：'
		},
		emoji: {
			open: '絵文字',
			search: '絵文字をさがす',
			favorites: 'お気に入り',
			recent: '最近使った絵文字',
			custom: 'カスタム絵文字',
			unicode: '絵文字',
			none: '見つかりませんでした',
			close: '閉じる',
			rateLimited: '少し待ってから送ってください。',
			failed: '送れませんでした。もう一度お試しください。'
		},
		report: {
			space: 'この Space を通報',
			member: '通報',
			about: (name: string) => `${name} さんを通報します`,
			title: '運営に通報する',
			lead: '通報は運営にだけ届き、相手には知らされません。音声や字幕は送られません。',
			reason: '理由',
			reasons: {
				spam: 'スパム・宣伝',
				harassment: '攻撃的・いやがらせ',
				sensitive: '不適切・センシティブ',
				botResponse: 'botたんの返答へのフィードバック',
				other: 'その他'
			},
			comment: 'くわしい内容（任意）',
			submit: '送信する',
			cancel: 'やめる',
			sent: '通報を送りました。',
			close: '閉じる',
			failed: '通報を送れませんでした。もう一度お試しください。',
			rateLimited: '短い時間に送りすぎました。しばらくしてからお試しください。'
		},
		banned: 'この Space には入れません。',
		endedTimeLimit: '開催時間の上限に達したため、この Space は終了しました。',
		speaking: '話しています'
	},
	landing: {
		eyebrow: 'Nagi の音声チャット',
		title: 'Nagi のみんなと、声でゆるくおしゃべり',
		lead: 'Nagi Space は、Nagi の利用者が集まって話したり聴いたりできる音声チャットです。聴くだけでも、絵文字を送るだけでも大丈夫。全肯定botたんも会話に呼べます。',
		start: 'Nagi のアカウントではじめる',
		noAccount: 'Nagi のアカウントをお持ちでないかたは',
		openNagi: 'Nagi へ',
		featuresTitle: 'できること',
		features: [
			{
				title: '声で集まる',
				body: 'ホストが Space を開くと、Nagi の利用者なら誰でも入れます。話したい人はリクエストして、ホストが承認するとスピーカーになれます。'
			},
			{
				title: '聴くだけ、絵文字だけでも',
				body: 'マイクを使わずに聴いていられます。気持ちは絵文字で届けられます。'
			},
			{
				title: 'botたんを呼べる',
				body: 'ホストはいつでも全肯定botたんを会話に呼べます。botたんは3Dで登場して、みんなの話に答えます。'
			}
		],
		safetyTitle: '安心して使えるように',
		safety: [
			{
				title: 'Nagi の利用者だけ',
				body: 'Nagi のアカウントでログインした人だけが入れます。'
			},
			{
				title: '何も残さない',
				body: '話した内容は字幕で表示されますが、録音も字幕も保存しません。Space が終わると消えます。'
			}
		],
		closing: 'さっそく Space をのぞいてみませんか？',
		sampleTitle: '金曜の夜のおしゃべり',
		sampleAlt: 'Space の画面の見本'
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
	common: {
		busy: 'Working'
	},
	settings: {
		open: 'Display settings',
		theme: 'Theme',
		system: 'Match device',
		light: 'Light',
		dark: 'Dark',
		language: 'Language',
		close: 'Close'
	},
	login: {
		title: 'Log in',
		lead: 'Log in with your Nagi account (AT Protocol handle).',
		handleLabel: 'Handle',
		handlePlaceholder: 'example.bsky.social',
		submit: 'Log in',
		noAccount: "Don't have a Nagi account?",
		openNagi: 'Go to Nagi',
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
		cancel: 'Cancel',
		share: 'Share to Nagi',
		shareHint: 'Posts to your Nagi with a link card to this Space.',
		shareTextLabel: 'Post text',
		shareDefault: (title: string) => `I started a Space: "${title}"`,
		errors: {
			empty: 'Enter a title.',
			tooLong: 'The title is too long.',
			kind: 'Choose a type.',
			botBusy: 'bot-tan is busy right now. Please try again in a moment.',
			botResting: 'bot-tan is taking a break right now. Please try again later.',
			roomFailed: 'Could not start the Space. Please try again.',
			notAllowed: 'Only some people can start Spaces right now.',
			shareEmpty: 'Enter the text to post.',
			shareTooLong: 'The post text is too long.'
		},
		notAllowed: 'Only some people can start Spaces right now. Please check back later.',
		active: 'You already have a live Space.',
		backToActive: 'Back to your Space'
	},
	space: {
		backHome: 'Back to top',
		noListeners: 'No listeners yet.',
		loginLead: 'Log in with your Nagi account to listen and talk in this Space.',
		botLoading: 'Loading bot-tan',
		micMuted: 'Mic off',
		speakers: 'Speakers',
		listeners: 'Listeners',
		actions: 'Space actions',
		micFailed: 'Could not switch the microphone. Please try again.',
		short: {
			unmute: 'Mic',
			mute: 'Mute',
			emoji: 'Emoji',
			request: 'Request',
			cancel: 'Cancel',
			toListener: 'Listen',
			report: 'Report',
			leave: 'Leave',
			end: 'End'
		},
		host: 'Host',
		speaker: 'Speaker',
		listener: 'Listener',
		connecting: 'Connecting…',
		reconnecting: 'Reconnecting…',
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
		shareFailed: 'Could not share to Nagi. Your Space is still live.',
		stage: {
			request: 'Request to speak',
			cancel: 'Cancel request',
			requested: 'Waiting for the host to approve.',
			invited: 'You were invited to speak.',
			acceptInvite: 'Accept',
			declineInvite: 'Decline',
			transcriptionNotice: 'What speakers say is shown to everyone as captions.',
			allowMic: 'Allow mic and start speaking',
			micDenied: 'You need to allow the mic to speak.',
			leave: 'Back to listening',
			requests: 'Requests to speak',
			noRequests: 'No requests right now.',
			manage: 'Manage participants',
			approve: 'Approve',
			invite: 'Invite',
			revoke: 'Move to listeners',
			speakersFull: 'The speaker limit has been reached.',
			mute: 'Mute',
			kick: 'Remove',
			kickConfirm: 'Remove from this Space and block them from rejoining.',
			kickCancel: 'Cancel',
			failed: 'Something went wrong. Please try again.'
		},
		shareRetry: 'Try sharing again',
		shareDone: 'Shared to Nagi.',
		leave: 'Leave',
		hostAway: 'Waiting for the host to reconnect',
		full: 'This Space is full.',
		removed: 'The host removed you from this Space. You cannot rejoin it.',
		bot: 'bot-tan',
		botControls: {
			title: 'bot-tan',
			hint: 'The host can invite bot-tan into the conversation at any time.',
			failed: 'Could not invite bot-tan. Please try again.',
			invite: 'Invite bot-tan',
			remove: 'Ask bot-tan to leave',
			busy: 'bot-tan is busy right now. You can invite them when they are free.',
			resting: 'bot-tan is taking a break right now. You can invite them when they are back.',
			joining: 'Inviting bot-tan…',
			left: 'bot-tan left because the connection was lost. You can invite them again.'
		},
		captions: {
			title: 'Captions',
			notice: 'What the host and speakers say is shown to everyone as captions.',
			paused: 'Captions are paused.',
			empty: 'No captions yet.',
			separator: ': '
		},
		emoji: {
			open: 'Emoji',
			search: 'Search emoji',
			favorites: 'Favorites',
			recent: 'Recently used',
			custom: 'Custom emoji',
			unicode: 'Emoji',
			none: 'No results',
			close: 'Close',
			rateLimited: 'Please wait a moment before sending more.',
			failed: 'Could not send. Please try again.'
		},
		report: {
			space: 'Report this Space',
			member: 'Report',
			about: (name: string) => `Report ${name}`,
			title: 'Report to the Nagi team',
			lead: 'Reports go only to the team and are not shared with the other person. No audio or captions are sent.',
			reason: 'Reason',
			reasons: {
				spam: 'Spam or advertising',
				harassment: 'Abusive or harassing',
				sensitive: 'Inappropriate or sensitive',
				botResponse: 'Feedback on bot-tan',
				other: 'Other'
			},
			comment: 'Details (optional)',
			submit: 'Send',
			cancel: 'Cancel',
			sent: 'Report sent.',
			close: 'Close',
			failed: 'Could not send the report. Please try again.',
			rateLimited: 'Too many reports. Please try again later.'
		},
		banned: 'You cannot join this Space.',
		endedTimeLimit: 'This Space ended because it reached the time limit.',
		speaking: 'Speaking'
	},
	landing: {
		eyebrow: 'Voice chat for Nagi',
		title: 'Hang out and talk with the Nagi community',
		lead: 'Nagi Space is a voice chat where Nagi users gather to talk and listen. You can just listen, or join in with emoji. The ever-affirming bot-tan can join the conversation too.',
		start: 'Get started with your Nagi account',
		noAccount: "Don't have a Nagi account?",
		openNagi: 'Go to Nagi',
		featuresTitle: 'What you can do',
		features: [
			{
				title: 'Gather by voice',
				body: 'When a host opens a Space, any Nagi user can come in. Ask to speak, and once the host approves, you become a speaker.'
			},
			{
				title: 'Just listen, or send emoji',
				body: 'Listen without a microphone, and share how you feel with emoji.'
			},
			{
				title: 'Invite bot-tan',
				body: 'The host can invite the ever-affirming bot-tan at any time. bot-tan appears in 3D and responds to everyone.'
			}
		],
		safetyTitle: 'Made to feel safe',
		safety: [
			{
				title: 'Nagi users only',
				body: 'Only people who log in with a Nagi account can come in.'
			},
			{
				title: 'Nothing is kept',
				body: 'What people say appears as captions, but no audio or captions are saved. Everything disappears when the Space ends.'
			}
		],
		closing: 'Why not drop into a Space?',
		sampleTitle: 'Friday night chat',
		sampleAlt: 'A sample of the Space screen'
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

export const LOCALE_COOKIE = 'ns_locale';

export function isLocale(value: unknown): value is Locale {
	return value === 'ja' || value === 'en';
}

/** Accept-Language から表示言語を決める。日本語以外は英語（LOOK-06）。 */
export function detectLocale(acceptLanguage: string | null): Locale {
	const first = acceptLanguage?.split(',')[0]?.trim().toLowerCase() ?? '';
	return first.startsWith('ja') ? 'ja' : 'en';
}
