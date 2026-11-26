import { describe, expect, it } from 'vitest';
import { isAgentRequest, parseAgentReport } from './agent';

describe('isAgentRequest', () => {
	it('共有の秘密が一致したときだけ通す', () => {
		expect(isAgentRequest('Bearer s3cret', 's3cret')).toBe(true);
		expect(isAgentRequest('Bearer wrong', 's3cret')).toBe(false);
		expect(isAgentRequest('Bearer s3cre', 's3cret')).toBe(false);
		expect(isAgentRequest(null, 's3cret')).toBe(false);
		// 秘密が設定されていなければ誰も通さない
		expect(isAgentRequest('Bearer ', undefined)).toBe(false);
	});
});

describe('parseAgentReport', () => {
	it('botたんと字幕の空きを受け取る', () => {
		expect(parseAgentReport({ bot: { free: 1, max: 2 }, captions: { free: 5, max: 6 } })).toEqual({
			bot: { free: 1, max: 2 },
			captions: { free: 5, max: 6 }
		});
		expect(
			parseAgentReport({ bot: { free: -1, max: 2 }, captions: { free: 0, max: 6 } })?.bot.free
		).toBe(0);
		expect(parseAgentReport({ bot: { free: 'x' } })).toBeUndefined();
	});
});
