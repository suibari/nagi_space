import { error, json } from '@sveltejs/kit';
import { isLoopbackOrigin } from '#lib/server/oauth/client.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const { auth, oauth } = await getRuntime();
	// ループバック開発では client_id 自体がメタデータなので配信しない
	if (isLoopbackOrigin(auth.origin)) error(404);
	return json(oauth.clientMetadata);
};
