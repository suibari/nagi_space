import { StoreUnavailableError, type KeyValueStore } from './types';

export type PostgrestStoreConfig = {
	/** PostgREST の URL（例 https://db.suibari.com） */
	url: string;
	schema: string;
	/** role=nagi_space_api の JWT。PostgREST の anon ロールに権限を与えている場合は不要 */
	jwt?: string;
	/** Cloudflare Access のサービストークン */
	cfAccess?: { clientId: string; clientSecret: string };
	fetchImpl?: typeof fetch;
	timeoutMs?: number;
};

/** 自宅DBの PostgREST 経由のストア。db/migrations の nagi_space.kv_* 関数を呼ぶ。 */
export class PostgrestStore implements KeyValueStore {
	readonly #headers: Record<string, string>;
	readonly #fetch: typeof fetch;

	constructor(private readonly config: PostgrestStoreConfig) {
		this.#fetch = config.fetchImpl ?? fetch;
		this.#headers = {
			'content-type': 'application/json',
			'content-profile': config.schema,
			'accept-profile': config.schema,
			...(config.jwt ? { authorization: `Bearer ${config.jwt}` } : {}),
			...(config.cfAccess
				? {
						'cf-access-client-id': config.cfAccess.clientId,
						'cf-access-client-secret': config.cfAccess.clientSecret
					}
				: {})
		};
	}

	async #rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
		let response: Response;
		try {
			response = await this.#fetch(new URL(`/rpc/${fn}`, this.config.url), {
				method: 'POST',
				headers: this.#headers,
				body: JSON.stringify(args),
				signal: AbortSignal.timeout(this.config.timeoutMs ?? 5000)
			});
		} catch (cause) {
			throw new StoreUnavailableError(`${fn}: ${cause instanceof Error ? cause.message : cause}`);
		}
		if (!response.ok) {
			const body = await response.text().catch(() => '');
			throw new StoreUnavailableError(`${fn} failed (${response.status}): ${body.slice(0, 200)}`);
		}
		const text = await response.text();
		return (text ? JSON.parse(text) : null) as T;
	}

	async get(key: string, touchTtlSeconds?: number) {
		const value = await this.#rpc<string | null>('kv_get', {
			p_key: key,
			p_touch_ttl_seconds: touchTtlSeconds ?? null
		});
		return value ?? undefined;
	}

	async getMany(keys: string[]) {
		if (!keys.length) return new Map<string, string>();
		const rows = await this.#rpc<Array<{ key: string; value: string }>>('kv_get_many', {
			p_keys: keys
		});
		return new Map(rows.map((row) => [row.key, row.value]));
	}

	async set(key: string, value: string, options: { ttlSeconds?: number; ifAbsent?: boolean } = {}) {
		return this.#rpc<boolean>('kv_set', {
			p_key: key,
			p_value: value,
			p_ttl_seconds: options.ttlSeconds ?? null,
			p_if_absent: options.ifAbsent ?? false
		});
	}

	async del(...keys: string[]) {
		if (keys.length) await this.#rpc('kv_del', { p_keys: keys });
	}

	async delIfEquals(key: string, value: string) {
		return this.#rpc<boolean>('kv_del_if', { p_key: key, p_value: value });
	}

	async list(prefix: string) {
		return this.#rpc<Array<{ key: string; value: string }>>('kv_list', { p_prefix: prefix });
	}

	async ttl(key: string) {
		return this.#rpc<number | null>('kv_ttl', { p_key: key });
	}
}
