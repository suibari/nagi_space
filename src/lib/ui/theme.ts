export type ThemePreference = 'system' | 'light' | 'dark';
const KEY = 'nagi-space-theme';
const COLORS = { light: '#f7f9f9', dark: '#090d0c' };

export function readTheme(): ThemePreference {
	try {
		const value = localStorage.getItem(KEY);
		return value === 'light' || value === 'dark' ? value : 'system';
	} catch {
		return 'system';
	}
}

/** テーマを当てて、この端末に保存する（LOOK-02）。初回描画の前の適用は static/theme-init.js が行う。 */
export function applyTheme(preference: ThemePreference): void {
	try {
		if (preference === 'system') localStorage.removeItem(KEY);
		else localStorage.setItem(KEY, preference);
	} catch {
		/* 保存できなくても、いまの画面には当てる */
	}
	const root = document.documentElement;
	if (preference === 'system') {
		root.removeAttribute('data-theme');
		root.style.colorScheme = 'light dark';
	} else {
		root.setAttribute('data-theme', preference);
		root.style.colorScheme = preference;
	}
	for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
		meta.content =
			preference === 'system'
				? meta.media.includes('dark')
					? COLORS.dark
					: COLORS.light
				: COLORS[preference];
	}
}
