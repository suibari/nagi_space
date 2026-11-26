import { isHttpError } from '@sveltejs/kit';
import { describe, expect, it } from 'vitest';
import { AppViewUnavailableError, fetchRegistration, requireNagiUser } from './nagi';

const APPVIEW = 'https://appview.example';
const DID = 'did:plc:abcdefghijklmnopqrstuvwx';

const respond =
	(status: number, body: unknown = {}): typeof fetch =>
	async () =>
		new Response(JSON.stringify(body), { status });

describe('fetchRegistration', () => {
	it('joinedAt がある人を登録済みとする', async () => {
		const fetchImpl = respond(200, { profile: { joinedAt: '2026-01-01T00:00:00Z' } });
		expect(await fetchRegistration(DID, APPVIEW, fetchImpl)).toBe('registered');
	});

	it('AppView が見かけただけの人（joinedAt なし）と 404 は未登録とする', async () => {
		expect(await fetchRegistration(DID, APPVIEW, respond(200, { profile: { did: DID } }))).toBe(
			'unregistered'
		);
		expect(await fetchRegistration(DID, APPVIEW, respond(404))).toBe('unregistered');
	});

	it('通信の失敗やサーバーエラーは未登録とみなさない', async () => {
		await expect(fetchRegistration(DID, APPVIEW, respond(502))).rejects.toThrow(
			AppViewUnavailableError
		);
		const failing: typeof fetch = async () => {
			throw new TypeError('fetch failed');
		};
		await expect(fetchRegistration(DID, APPVIEW, failing)).rejects.toThrow(AppViewUnavailableError);
	});

	it('getProfile に DID を渡す', async () => {
		let requested = '';
		const fetchImpl: typeof fetch = async (input) => {
			requested = String(input);
			return new Response('{}', { status: 404 });
		};
		await fetchRegistration(DID, APPVIEW, fetchImpl);
		expect(requested).toContain('/xrpc/com.suibari.nagi.getProfile?actor=did%3Aplc%3A');
	});
});

describe('requireNagiUser', () => {
	const statusOf = (locals: App.Locals) => {
		try {
			requireNagiUser(locals);
			return 200;
		} catch (e) {
			if (isHttpError(e)) return e.status;
			throw e;
		}
	};

	it('登録済みの利用者だけを通す', () => {
		expect(statusOf({ locale: 'ja', did: DID, nagiUser: 'registered' })).toBe(200);
		expect(statusOf({ locale: 'ja', did: DID, nagiUser: 'unregistered' })).toBe(403);
		expect(statusOf({ locale: 'ja', did: DID, nagiUser: 'unknown' })).toBe(503);
		expect(statusOf({ locale: 'ja', nagiUser: 'anonymous' })).toBe(401);
	});
});
