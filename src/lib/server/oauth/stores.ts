import type {
	NodeSavedSession,
	NodeSavedSessionStore,
	NodeSavedState,
	NodeSavedStateStore,
	RuntimeLock
} from '@atproto/oauth-client-node';
import type { SecretBox } from '../crypto';
import type { KeyValueStore } from '../store/types';

const STATE_TTL_SECONDS = 60 * 60;
const LOCK_TTL_SECONDS = 45;
const LOCK_RETRY_MS = 100;

export const OAUTH_SESSION_PREFIX = 'oauth:session:';

function encryptedStore<T>(
	store: KeyValueStore,
	box: SecretBox,
	prefix: string,
	ttlSeconds?: number
) {
	return {
		async set(key: string, value: T) {
			await store.set(prefix + key, box.seal(JSON.stringify(value)), { ttlSeconds });
		},
		async get(key: string): Promise<T | undefined> {
			const sealed = await store.get(prefix + key);
			const json = sealed ? box.open(sealed) : undefined;
			return json ? (JSON.parse(json) as T) : undefined;
		},
		async del(key: string) {
			await store.del(prefix + key);
		}
	};
}

/** 認可の途中の状態。1時間で消える。 */
export function createStateStore(store: KeyValueStore, box: SecretBox): NodeSavedStateStore {
	return encryptedStore<NodeSavedState>(store, box, 'oauth:state:', STATE_TTL_SECONDS);
}

/** OAuth セッション（トークンとDPoP鍵）。期限はOAuthサーバー側の失効に任せる。 */
export function createSessionStore(store: KeyValueStore, box: SecretBox): NodeSavedSessionStore {
	return encryptedStore<NodeSavedSession>(store, box, OAUTH_SESSION_PREFIX);
}

/** 複数のサーバーレス実行が同じセッションを同時に更新しないようにするロック。 */
export function createRequestLock(store: KeyValueStore): RuntimeLock {
	return async (name, fn) => {
		const key = `oauth:lock:${name}`;
		const token = crypto.randomUUID();
		const deadline = Date.now() + LOCK_TTL_SECONDS * 1000;
		while (!(await store.set(key, token, { ifAbsent: true, ttlSeconds: LOCK_TTL_SECONDS }))) {
			if (Date.now() > deadline) throw new Error(`Could not acquire lock: ${name}`);
			await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
		}
		try {
			return await fn();
		} finally {
			// 自分が取ったロックだけを外す
			await store.delIfEquals(key, token);
		}
	};
}
