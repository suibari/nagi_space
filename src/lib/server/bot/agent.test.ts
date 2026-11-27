import { describe, expect, it } from 'vitest';
import { agentToken, isAgentRequest, parseAgentReport } from './agent';

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

describe('agentToken', () => {
	const livekit = { url: 'ws://lk', apiKey: 'key', apiSecret: 'secret-secret-secret-secret-0000' };
	const grants = async (who: 'captions' | 'bot', listen?: boolean) => {
		const jwt = await agentToken(livekit, 'room1', who, { listen });
		return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).video;
	};

	it('パブリックSpace の botたんは声を出すだけで、聞かない', async () => {
		expect(await grants('bot')).toMatchObject({ canPublish: true, canSubscribe: false });
	});

	it('botたんSpace の botたんはホストの声も聞く（字幕と共用。simplify-bot-space D1）', async () => {
		expect(await grants('bot', true)).toMatchObject({ canPublish: true, canSubscribe: true });
	});

	it('字幕用は見えない参加者で、聞くだけ', async () => {
		expect(await grants('captions')).toMatchObject({
			hidden: true,
			canSubscribe: true,
			canPublish: false
		});
	});
});
