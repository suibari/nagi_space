import {
	JoseKey,
	NodeOAuthClient,
	buildAtprotoLoopbackClientMetadata,
	type NodeSavedSessionStore,
	type NodeSavedStateStore,
	type OAuthClientMetadataInput,
	type RuntimeLock
} from '@atproto/oauth-client-node';
import { OAUTH_SCOPE } from './scope';

export const CALLBACK_PATH = '/oauth/callback';
export const CLIENT_METADATA_PATH = '/oauth-client-metadata.json';
export const JWKS_PATH = '/jwks.json';

/** ローカル開発のループバック（http://127.0.0.1 / http://[::1]）か。 */
export function isLoopbackOrigin(origin: string): boolean {
	const { protocol, hostname } = new URL(origin);
	return protocol === 'http:' && (hostname === '127.0.0.1' || hostname === '[::1]');
}

/**
 * client metadata を組み立てる。本番は private_key_jwt の confidential client、
 * ローカル開発は鍵を持たないループバッククライアントにする。
 */
export function buildClientMetadata(origin: string): OAuthClientMetadataInput {
	const redirectUri = new URL(CALLBACK_PATH, origin).href;
	if (isLoopbackOrigin(origin)) {
		return buildAtprotoLoopbackClientMetadata({ scope: OAUTH_SCOPE, redirect_uris: [redirectUri] });
	}
	return {
		client_id: new URL(CLIENT_METADATA_PATH, origin).href,
		client_name: 'Nagi Space',
		client_uri: origin,
		redirect_uris: [redirectUri],
		scope: OAUTH_SCOPE,
		grant_types: ['authorization_code', 'refresh_token'],
		response_types: ['code'],
		application_type: 'web',
		token_endpoint_auth_method: 'private_key_jwt',
		token_endpoint_auth_signing_alg: 'ES256',
		dpop_bound_access_tokens: true,
		jwks_uri: new URL(JWKS_PATH, origin).href
	};
}

export type OAuthClientDeps = {
	origin: string;
	privateKeyJwk?: string;
	stateStore: NodeSavedStateStore;
	sessionStore: NodeSavedSessionStore;
	requestLock: RuntimeLock;
};

export async function createOAuthClient(deps: OAuthClientDeps): Promise<NodeOAuthClient> {
	const clientMetadata = buildClientMetadata(deps.origin);
	const loopback = isLoopbackOrigin(deps.origin);
	if (!loopback && !deps.privateKeyJwk) {
		throw new Error('OAUTH_PRIVATE_KEY_JWK is required outside loopback development');
	}
	const keyset =
		loopback || !deps.privateKeyJwk
			? undefined
			: [await JoseKey.fromImportable(deps.privateKeyJwk, 'key1')];
	return new NodeOAuthClient({
		clientMetadata,
		keyset,
		stateStore: deps.stateStore,
		sessionStore: deps.sessionStore,
		requestLock: deps.requestLock
	});
}
