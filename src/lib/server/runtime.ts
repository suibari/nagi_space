import * as privateEnv from '$app/env/private';
import type { NodeOAuthClient, NodeSavedSessionStore } from '@atproto/oauth-client-node';
import type { Verifier } from '@suibari/nagi-passport/verify';
import { WebhookReceiver } from 'livekit-server-sdk';
import { loadAuthConfig, loadServiceConfig, type AuthConfig } from './config';
import { SecretBox } from './crypto';
import {
	DEFAULT_NAGI_APPVIEW_URL,
	createRegistrationChecker,
	type RegistrationResult
} from './nagi';
import { createOAuthClient } from './oauth/client';
import { createRequestLock, createSessionStore, createStateStore } from './oauth/stores';
import { DEFAULT_PASSPORT_ISSUER, createSsoVerifier, createTicketStore } from './passport';
import { parseAllowlist } from './allowlist';
import { BotRequests } from './bot/agent';
import type { ServiceConfig } from './config';
import { createFavoritesLoader } from './emoji';
import { createMuteChecker } from './mutes';
import { createStore } from './services';
import { SessionManager } from './session';
import { SpaceLifecycle } from './spaces/lifecycle';
import { loadLimits } from './spaces/limits';
import { SpaceRooms } from './spaces/livekit';
import { PresenceStore } from './spaces/presence';
import { SpaceRepository } from './spaces/repository';
import { Stage } from './spaces/stage';
import type { KeyValueStore } from './store/types';

export type Runtime = {
	auth: AuthConfig;
	store: KeyValueStore;
	oauth: NodeOAuthClient;
	oauthSessions: NodeSavedSessionStore;
	sessions: SessionManager;
	sso: Verifier;
	checkRegistration: (did: string, cached?: string | null) => Promise<RegistrationResult>;
	spaces: SpaceRepository;
	rooms: SpaceRooms;
	presence: PresenceStore;
	webhooks: WebhookReceiver;
	lifecycle: SpaceLifecycle;
	stage: Stage;
	mutedBy: (did: string) => Promise<Set<string>>;
	creatorAllowlist: Set<string> | undefined;
	appviewUrl: string;
	agentSecret: string | undefined;
	/** botたんの3Dモデルと動きの置き場（BOT-05）。無ければ3Dを出さずアイコンにする */
	botAssetsBase: string | undefined;
	botAssetsDir: string | undefined;
	botRequests: BotRequests;
	livekit: ServiceConfig['livekit'];
	emojiFavorites: (did: string) => Promise<import('#lib/emoji/types.ts').EmojiChoice[]>;
};

let runtime: Promise<Runtime> | undefined;

async function init(): Promise<Runtime> {
	const env: Record<string, string | undefined> = { ...privateEnv };
	const services = loadServiceConfig(env);
	const auth = loadAuthConfig(env);
	const store = createStore(services);
	const box = new SecretBox(auth.sessionSecret);
	const oauthSessions = createSessionStore(store, box);
	const oauth = await createOAuthClient({
		origin: auth.origin,
		privateKeyJwk: auth.privateKeyJwk,
		stateStore: createStateStore(store, box),
		sessionStore: oauthSessions,
		requestLock: createRequestLock(store)
	});
	const appviewUrl = env.NAGI_APPVIEW_URL || DEFAULT_NAGI_APPVIEW_URL;
	const spaces = new SpaceRepository(store);
	const presence = new PresenceStore(store);
	const limits = loadLimits(env);
	const rooms = new SpaceRooms(services.livekit, limits);
	const stage = new Stage(store, rooms, presence, limits);
	return {
		auth,
		store,
		oauth,
		oauthSessions,
		sessions: new SessionManager(store, auth.origin.startsWith('https:')),
		sso: createSsoVerifier({
			issuer: env.NAGI_PASSPORT_ISSUER || DEFAULT_PASSPORT_ISSUER,
			audience: auth.origin,
			store: createTicketStore(store)
		}),
		checkRegistration: createRegistrationChecker(store, appviewUrl),
		spaces,
		rooms,
		presence,
		webhooks: new WebhookReceiver(services.livekit.apiKey, services.livekit.apiSecret),
		lifecycle: new SpaceLifecycle(store, spaces, presence, rooms, limits, stage),
		stage,
		mutedBy: createMuteChecker(store, (did) => oauth.restore(did)),
		creatorAllowlist: parseAllowlist(env.SPACE_CREATOR_ALLOWLIST),
		appviewUrl,
		agentSecret: env.AGENT_SECRET || undefined,
		botAssetsBase: env.BOT_ASSETS_BASE_URL || (env.BOT_ASSETS_DIR ? '/bot-assets' : undefined),
		botAssetsDir: env.BOT_ASSETS_DIR || undefined,
		botRequests: new BotRequests(store),
		livekit: services.livekit,
		emojiFavorites: createFavoritesLoader(store, (did) => oauth.restore(did), appviewUrl)
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
