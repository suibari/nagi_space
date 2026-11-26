import type {
	NodeSavedSession,
	NodeSavedSessionStore,
	NodeSavedState,
	NodeSavedStateStore,
	RuntimeLock
} from '@atproto/oauth-client-node';
import type { RedisClientType } from 'redis';
import type { SecretBox } from '../crypto';

const STATE_TTL_SECONDS = 60 * 60;
const LOCK_TTL_MS = 45_000;
const LOCK_RETRY_MS = 100;

function encryptedStore<T>(redis: RedisClientType, box: SecretBox, prefix: string, ttl?: number) {
	return {
		async set(key: string, value: T) {
			const sealed = box.seal(JSON.stringify(value));
			await redis.set(prefix + key, sealed, ttl ? { EX: ttl } : undefined);
		},
		async get(key: string): Promise<T | undefined> {
			const sealed = await redis.get(prefix + key);
			const json = sealed ? box.open(sealed) : undefined;
			return json ? (JSON.parse(json) as T) : undefined;
		},
		async del(key: string) {
			await redis.del(prefix + key);
		}
	};
}

/** 認可の途中の状態。1時間で消える。 */
export function createStateStore(redis: RedisClientType, box: SecretBox): NodeSavedStateStore {
	return encryptedStore<NodeSavedState>(redis, box, 'oauth:state:', STATE_TTL_SECONDS);
}

/** OAuth セッション（トークンとDPoP鍵）。期限はOAuthサーバー側の失効に任せる。 */
export function createSessionStore(redis: RedisClientType, box: SecretBox): NodeSavedSessionStore {
	return encryptedStore<NodeSavedSession>(redis, box, 'oauth:session:');
}

/** 複数のサーバーレス実行が同じセッションを同時に更新しないようにするロック。 */
export function createRequestLock(redis: RedisClientType): RuntimeLock {
	return async (name, fn) => {
		const key = `oauth:lock:${name}`;
		const token = crypto.randomUUID();
		const deadline = Date.now() + LOCK_TTL_MS;
		while ((await redis.set(key, token, { NX: true, PX: LOCK_TTL_MS })) !== 'OK') {
			if (Date.now() > deadline) throw new Error(`Could not acquire lock: ${name}`);
			await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
		}
		try {
			return await fn();
		} finally {
			// 自分が取ったロックだけを外す
			await redis.eval(
				"if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
				{ keys: [key], arguments: [token] }
			);
		}
	};
}
