import * as privateEnv from '$app/env/private';
import type { NodeOAuthClient, NodeSavedSessionStore } from '@atproto/oauth-client-node';
import type { RedisClientType } from 'redis';
import { loadAuthConfig, loadServiceConfig, type AuthConfig } from './config';
import { SecretBox } from './crypto';
import { createOAuthClient } from './oauth/client';
import { createRequestLock, createSessionStore, createStateStore } from './oauth/stores';
import { connectRedis } from './services';
import { DEFAULT_PASSPORT_ISSUER, createSsoVerifier, createTicketStore } from './passport';
import { SessionManager } from './session';
import { SpaceRepository } from './spaces/repository';
import { SpaceRooms } from './spaces/livekit';
import { PresenceStore } from './spaces/presence';
import { WebhookReceiver } from 'livekit-server-sdk';
import {
	DEFAULT_NAGI_APPVIEW_URL,
	createRegistrationChecker,
	type RegistrationResult
} from './nagi';
import type { Verifier } from '@suibari/nagi-passport/verify';

export type Runtime = {
	auth: AuthConfig;
	redis: RedisClientType;
	oauth: NodeOAuthClient;
	oauthSessions: NodeSavedSessionStore;
	sessions: SessionManager;
	sso: Verifier;
	checkRegistration: (did: string) => Promise<RegistrationResult>;
	spaces: SpaceRepository;
	rooms: SpaceRooms;
	presence: PresenceStore;
	webhooks: WebhookReceiver;
};

let runtime: Promise<Runtime> | undefined;

async function init(): Promise<Runtime> {
	const env: Record<string, string | undefined> = { ...privateEnv };
	const services = loadServiceConfig(env);
	const auth = loadAuthConfig(env);
	const redis = await connectRedis(services);
	const box = new SecretBox(auth.sessionSecret);
	const oauthSessions = createSessionStore(redis, box);
	const oauth = await createOAuthClient({
		origin: auth.origin,
		privateKeyJwk: auth.privateKeyJwk,
		stateStore: createStateStore(redis, box),
		sessionStore: oauthSessions,
		requestLock: createRequestLock(redis)
	});
	const sessions = new SessionManager(redis, auth.origin.startsWith('https:'));
	const sso = createSsoVerifier({
		issuer: env.NAGI_PASSPORT_ISSUER || DEFAULT_PASSPORT_ISSUER,
		audience: auth.origin,
		store: createTicketStore(redis)
	});
	const checkRegistration = createRegistrationChecker(
		redis,
		env.NAGI_APPVIEW_URL || DEFAULT_NAGI_APPVIEW_URL
	);
	const spaces = new SpaceRepository(redis);
	const rooms = new SpaceRooms(services.livekit);
	const presence = new PresenceStore(redis);
	const webhooks = new WebhookReceiver(services.livekit.apiKey, services.livekit.apiSecret);
	return {
		auth,
		redis,
		oauth,
		oauthSessions,
		sessions,
		sso,
		checkRegistration,
		spaces,
		rooms,
		presence,
		webhooks
	};
}

/** サーバーのインスタンスごとに1回だけ初期化する。失敗したら次の要求で作り直す。 */
export function getRuntime(): Promise<Runtime> {
	runtime ??= init().catch((error) => {
		runtime = undefined;
		throw error;
	});
	return runtime;
}
