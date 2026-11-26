/**
 * 期限付きのキー・値ストア（design.md D1）。保存先を差し替えられるよう、
 * サーバーの各処理はこのインターフェースだけに依存する。
 */
export interface KeyValueStore {
	/** 値を取得する。touchTtlSeconds を渡すと、見つかったときに期限を延ばす。 */
	get(key: string, touchTtlSeconds?: number): Promise<string | undefined>;
	/** 複数のキーを1回で取得する。 */
	getMany(keys: string[]): Promise<Map<string, string>>;
	/** 書き込む。ifAbsent なら、まだ無いときだけ書き、書けたかを返す。 */
	set(
		key: string,
		value: string,
		options?: { ttlSeconds?: number; ifAbsent?: boolean }
	): Promise<boolean>;
	del(...keys: string[]): Promise<void>;
	/** 値が一致するときだけ消す。 */
	delIfEquals(key: string, value: string): Promise<boolean>;
	/** 接頭辞で一覧する（キーの昇順）。 */
	list(prefix: string): Promise<Array<{ key: string; value: string }>>;
	/** 期限付きで1つ数え上げ、数えたあとの値を返す。期限が切れていたら1から数え直す。 */
	incr(key: string, ttlSeconds: number): Promise<number>;
	/** 残りの期限（秒）。期限なしは null、無いキーは -1。 */
	ttl(key: string): Promise<number | null>;
}

export class StoreUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'StoreUnavailableError';
	}
}
