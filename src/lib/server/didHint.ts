const DID_PATTERN = /^did:(plc:[a-z2-7]{24}|web:[a-zA-Z0-9.%-]+)$/;

/** 署名の無い ?did= ヒントの形だけを確かめる。認証には使わない。 */
export function isDidHint(value: string | null): value is string {
	return value !== null && DID_PATTERN.test(value);
}

/**
 * Nagi のリンクから ?did= 付きで来た未ログインの閲覧者を、ヒント付きのログインへ送る先（ACC-01）。
 * 戻り先からは did を落とす。アドレスバーに他人の DID が残ったまま共有されないようにするため。
 */
export function didHintLogin(url: URL): string | undefined {
	const hint = url.searchParams.get('did');
	if (!isDidHint(hint)) return undefined;
	const rest = new URLSearchParams(url.searchParams);
	rest.delete('did');
	const query = rest.toString();
	const returnTo = `${url.pathname}${query ? `?${query}` : ''}`;
	return `/login?${new URLSearchParams({ did: hint, returnTo })}`;
}
