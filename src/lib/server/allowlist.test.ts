import { describe, expect, it } from 'vitest';
import { canCreateSpace, parseAllowlist } from './allowlist';

describe('作成の許可リスト', () => {
	it('設定が無ければ誰でも作れる', () => {
		expect(parseAllowlist(undefined)).toBeUndefined();
		expect(parseAllowlist(' , ')).toBeUndefined();
		expect(canCreateSpace(undefined, 'did:plc:anyone')).toBe(true);
	});

	it('設定があれば、リストにある人だけが作れる', () => {
		const list = parseAllowlist('did:plc:a, did:plc:b');
		expect(canCreateSpace(list, 'did:plc:a')).toBe(true);
		expect(canCreateSpace(list, 'did:plc:c')).toBe(false);
	});
});
