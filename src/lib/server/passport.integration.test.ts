import { createIssuer, generateKeyPair } from '@suibari/nagi-passport/issuer';
import type { RedisClientType } from 'redis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadServiceConfig } from './config';
import { createSsoVerifier, createTicketStore, isDidHint, verifyTicket } from './passport';
import { connectRedis } from './services';

const ISSUER = 'https://nagi-api.example';
const AUDIENCE = 'https://space.example';
const DID = 'did:plc:abcdefghijklmnopqrstuvwx';

describe('isDidHint', () => {
	it('did:plc と did:web の形だけを受け付ける', () => {
		expect(isDidHint(DID)).toBe(true);
		expect(isDidHint('did:web:example.com')).toBe(true);
		expect(isDidHint('did:plc:short')).toBe(false);
		expect(isDidHint('alice.bsky.social')).toBe(false);
		expect(isDidHint(null)).toBe(false);
	});
});

// 単回使用の記録に実際の Redis を使う。INTEGRATION=1 のときだけ動かす。
describe.runIf(process.env.INTEGRATION === '1')('SSOチケットの検証', () => {
	let redis: RedisClientType;
	let keys: Awaited<ReturnType<typeof generateKeyPair>>;

	beforeAll(async () => {
		redis = await connectRedis(loadServiceConfig(process.env));
		keys = await generateKeyPair('test');
	});
	afterAll(async () => {
		await redis.quit();
	});

	const verifier = (audience = AUDIENCE) =>
		createSsoVerifier({
			issuer: ISSUER,
			audience,
			store: createTicketStore(redis),
			publicJwks: [{ ...keys.publicJwk }],
			clockToleranceSec: 0
		});
	const issue = (ttlSeconds = 60, audience = AUDIENCE) =>
		createIssuer({
			issuer: ISSUER,
			privateJwk: { ...keys.privateJwk },
			audiences: [audience],
			ttlSeconds
		})
			.createTicket({ did: DID, audience })
			.then((result) => result.ticket);

	it('正しいチケットからDIDを得る', async () => {
		expect(await verifyTicket(verifier(), await issue())).toBe(DID);
	});

	it('同じチケットの再提示を拒否する', async () => {
		const ticket = await issue();
		expect(await verifyTicket(verifier(), ticket)).toBe(DID);
		expect(await verifyTicket(verifier(), ticket)).toBeUndefined();
	});

	it('他のアプリ宛のチケットを拒否する', async () => {
		const ticket = await issue(60, 'https://room.example');
		expect(await verifyTicket(verifier(), ticket)).toBeUndefined();
	});

	it('期限切れのチケットを拒否する', async () => {
		const ticket = await issue(1);
		await new Promise((resolve) => setTimeout(resolve, 2100));
		expect(await verifyTicket(verifier(), ticket)).toBeUndefined();
	});

	it('壊れたチケットを拒否する', async () => {
		expect(await verifyTicket(verifier(), 'not-a-ticket')).toBeUndefined();
	});
});
