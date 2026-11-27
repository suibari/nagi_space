/**
 * botたんSpace のホストの最近の Nagi の投稿（BOT-08、design.md D2）。ホストの PDS の公開の
 * listRecords から読み、その場で整えて返す。保存せず、本文はログに出さない。
 */

const COLLECTION = 'com.suibari.nagi.post';
const DAYS = 7;
const MAX_POSTS = 20;
const MAX_CHARS = 200;
const FETCH_LIMIT = 50;
const TIMEOUT_MS = 3000;

export type HostPost = { text: string; createdAt: string };

type PostRecord = {
	text?: unknown;
	createdAt?: unknown;
	labels?: unknown;
	cwRestricted?: unknown;
	kossori?: unknown;
};

export type DidDocument = {
	service?: Array<{ id?: unknown; type?: unknown; serviceEndpoint?: unknown }>;
};

/** DID 文書から PDS の URL を取り出す。https 以外は使わない。 */
export function pdsUrlOf(didDoc: DidDocument): URL | undefined {
	const service = didDoc.service?.find(
		(s) =>
			(s.id === '#atproto_pds' || (typeof s.id === 'string' && s.id.endsWith('#atproto_pds'))) &&
			s.type === 'AtprotoPersonalDataServer'
	);
	if (typeof service?.serviceEndpoint !== 'string') return undefined;
	try {
		const url = new URL(service.serviceEndpoint);
		return url.protocol === 'https:' ? url : undefined;
	} catch {
		return undefined;
	}
}

/** 渡してよい投稿だけを、新しい順に最大20件・1件200字に整える。 */
export function selectHostPosts(records: PostRecord[], now = new Date()): HostPost[] {
	const since = now.getTime() - DAYS * 24 * 3600 * 1000;
	const posts: HostPost[] = [];
	for (const record of records) {
		if (typeof record.text !== 'string' || typeof record.createdAt !== 'string') continue;
		const at = Date.parse(record.createdAt);
		if (Number.isNaN(at) || at < since || at > now.getTime() + 60_000) continue;
		// こっそり投稿・CW 付き・ラベル付きは渡さない
		if (record.kossori === true || record.cwRestricted === true) continue;
		if (record.labels !== undefined && record.labels !== null) continue;
		const text = record.text.replace(/\s+/g, ' ').trim();
		if (!text) continue;
		posts.push({
			text: text.length > MAX_CHARS ? `${text.slice(0, MAX_CHARS)}…` : text,
			createdAt: record.createdAt
		});
	}
	return posts
		.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
		.slice(0, MAX_POSTS);
}

function ago(createdAt: string, now: Date): string {
	const days = Math.floor((now.getTime() - Date.parse(createdAt)) / (24 * 3600 * 1000));
	return days <= 0 ? '今日' : days === 1 ? '昨日' : `${days}日前`;
}

/** botたんに渡す文脈の文にする。投稿が無ければ空。 */
export function hostContext(name: string, posts: HostPost[], now = new Date()): string {
	if (!posts.length) return '';
	const lines = posts.map((post) => `- ${ago(post.createdAt, now)}: ${post.text}`);
	return [
		'-----ここからは、いま話している相手が最近 Nagi に書いたことです-----',
		`（相手の${name}さんが最近 Nagi に書いたこと。会話の話題にしてよいが、全部を読み上げたり、書いていないことを決めつけたりしない。相手から話が出たときや、話題が尽きたときに自然に触れる）`,
		...lines
	].join('\n');
}

/**
 * ホストの最近の投稿を読む。PDS に届かない・3秒で返らないときは空にする（BOT-08）。
 * resolveDidDoc は OAuth と同じ DID の解決を渡す。
 */
export async function fetchHostPosts(
	did: string,
	resolveDidDoc: (did: string, signal: AbortSignal) => Promise<DidDocument>,
	fetchImpl: typeof fetch = fetch,
	now = new Date()
): Promise<HostPost[]> {
	const signal = AbortSignal.timeout(TIMEOUT_MS);
	try {
		const pds = pdsUrlOf(await resolveDidDoc(did, signal));
		if (!pds) return [];
		const url = new URL('/xrpc/com.atproto.repo.listRecords', pds);
		url.searchParams.set('repo', did);
		url.searchParams.set('collection', COLLECTION);
		url.searchParams.set('limit', String(FETCH_LIMIT));
		const response = await fetchImpl(url, { signal });
		if (!response.ok) return [];
		const body = (await response.json()) as { records?: Array<{ value?: PostRecord }> };
		return selectHostPosts(
			(body.records ?? []).map((r) => r.value ?? {}),
			now
		);
	} catch (cause) {
		// 本文を含めず、失敗の種類だけを出す
		console.warn('[bot] host posts unavailable', cause instanceof Error ? cause.name : 'error');
		return [];
	}
}

/**
 * space-agent が botたんの会話を作るときに渡す文脈（design.md D1・D7）。botたんSpace だけホストの
 * 投稿を読み、パブリックSpace では誰の投稿も渡さない。
 */
export async function contextForSpace(
	space: {
		kind: 'public' | 'bot';
		hostDid: string;
		host: { handle: string; displayName?: string };
	},
	resolveDidDoc: (did: string, signal: AbortSignal) => Promise<DidDocument>,
	fetchImpl: typeof fetch = fetch,
	now = new Date()
): Promise<string> {
	if (space.kind !== 'bot') return '';
	const posts = await fetchHostPosts(space.hostDid, resolveDidDoc, fetchImpl, now);
	return hostContext(space.host.displayName || space.host.handle, posts, now);
}
