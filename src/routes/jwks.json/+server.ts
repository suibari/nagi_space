import { json } from '@sveltejs/kit';
import { getRuntime } from '#lib/server/runtime.ts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	const { oauth } = await getRuntime();
	return json(oauth.jwks);
};
