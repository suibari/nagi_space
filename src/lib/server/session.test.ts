import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './session';

describe('safeReturnTo', () => {
	it('同じサイト内のパスはそのまま使う', () => {
		expect(safeReturnTo('/s/abc?x=1')).toBe('/s/abc?x=1');
	});

	it('外部や不正な戻り先はトップにする', () => {
		for (const value of ['https://evil.example', '//evil.example', '/\\evil.example', '', null]) {
			expect(safeReturnTo(value)).toBe('/');
		}
	});
});
