/**
 * 一般公開の前は、Space を作れる人を許可リストに限る（作業5.10、design.md D8）。
 * 総合通信局への事前相談（作業1.4）が済むまで、本番で設定しておく。空なら誰でも作れる。
 */
export function parseAllowlist(value: string | undefined): Set<string> | undefined {
	const dids = (value ?? '')
		.split(',')
		.map((did) => did.trim())
		.filter(Boolean);
	return dids.length ? new Set(dids) : undefined;
}

export function canCreateSpace(allowlist: Set<string> | undefined, did: string): boolean {
	return !allowlist || allowlist.has(did);
}
