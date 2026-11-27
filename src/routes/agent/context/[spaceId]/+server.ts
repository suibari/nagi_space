import { error, json } from '@sveltejs/kit';
import { isAgentRequest } from '#lib/server/bot/agent.ts';
import { contextForSpace, type DidDocument } from '#lib/server/bot/hostPosts.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import type { RequestHandler } from './$types';

/**
 * space-agent が botたんの会話を作るときに読む文脈（BOT-08、design.md D1）。その場でホストの PDS を
 * 読んで返し、保存しない。パブリックSpace では空。
 */
export const GET: RequestHandler = async ({ params, request }) => {
	const { agentSecret, lifecycle, oauth } = await getRuntime();
	if (!isAgentRequest(request.headers.get('authorization'), agentSecret))
		error(401, 'Unauthorized');
	const space = isSpaceId(params.spaceId) ? await lifecycle.getLive(params.spaceId) : undefined;
	if (!space) error(404, 'Space not found');
	const context = await contextForSpace(space, async (did, signal) => {
		const identity = await oauth.identityResolver.resolve(did, { signal });
		return identity.didDoc as DidDocument;
	});
	return json({ context }, { headers: { 'cache-control': 'no-store' } });
};
