import { describe, expect, it } from 'vitest';
import type { Space } from '#lib/server/spaces/model.ts';
import { initialRole, visibleTo } from './access.ts';

const base: Space = {
	id: 'abcdefghjkmn',
	kind: 'public',
	hostDid: 'did:plc:host',
	host: { did: 'did:plc:host', handle: 'host.test' },
	title: 'テスト',
	startedAt: '2026-11-26T00:00:00.000Z'
};

describe('visibleTo', () => {
	it('パブリックSpaceは誰にでも見える', () => {
		expect(visibleTo(base, undefined)).toBe(base);
		expect(visibleTo(base, 'did:plc:other')).toBe(base);
	});

	it('botたんSpaceはホストにだけ見え、ほかの人には存在しないのと同じ', () => {
		const bot = { ...base, kind: 'bot' as const };
		expect(visibleTo(bot, 'did:plc:host')).toBe(bot);
		expect(visibleTo(bot, 'did:plc:other')).toBeUndefined();
		expect(visibleTo(bot, undefined)).toBeUndefined();
	});
});

describe('initialRole', () => {
	it('ホストはホスト、ほかの人は聴衆として入る', () => {
		expect(initialRole(base, 'did:plc:host')).toBe('host');
		expect(initialRole(base, 'did:plc:other')).toBe('listener');
	});
});
