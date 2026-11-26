// 初回描画の前に、保存したテーマ（端末の設定に合わせる・ライト・ダーク）を当てて、明るい画面の
// 点滅を防ぐ（LOOK-02）。CSP の script-src 'self' のまま配れるよう、外部ファイルにしている（Nagi と同じ）。
(function () {
	var light = '#f7f9f9';
	var dark = '#090d0c';
	var theme = null;
	try {
		theme = localStorage.getItem('nagi-space-theme');
	} catch (_) {
		theme = null;
	}
	var root = document.documentElement;
	if (theme === 'light' || theme === 'dark') {
		root.setAttribute('data-theme', theme);
		root.style.colorScheme = theme;
	} else {
		root.removeAttribute('data-theme');
		root.style.colorScheme = 'light dark';
	}
	var metas = document.querySelectorAll('meta[name="theme-color"]');
	for (var i = 0; i < metas.length; i += 1) {
		var color = theme === 'light' ? light : theme === 'dark' ? dark : undefined;
		if (!color) color = metas[i].media.indexOf('dark') === -1 ? light : dark;
		metas[i].setAttribute('content', color);
	}
})();
