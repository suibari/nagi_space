import { error, json } from '@sveltejs/kit';
import { requireNagiUser } from '#lib/server/nagi.ts';
import { ReportError, buildReportBody, parseReportInput, sendReport } from '#lib/server/report.ts';
import { getRuntime } from '#lib/server/runtime.ts';
import { isSpaceId } from '#lib/server/spaces/model.ts';
import { visibleTo } from '../access.ts';
import type { RequestHandler } from './$types';

/** Space または参加者を運営へ通報する（PART-07）。参加者なら誰でも使える。 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const did = requireNagiUser(locals);
	const { spaces, oauth, auth } = await getRuntime();
	const space = visibleTo(isSpaceId(params.id) ? await spaces.get(params.id) : undefined, did);
	if (!space) error(404, 'Space not found');
	const input = parseReportInput(await request.json().catch(() => ({})));
	if (!input) error(400, 'Invalid report');
	if (input.member === did) error(400, 'You cannot report yourself');

	const body = buildReportBody(space, new URL(`/s/${space.id}`, auth.origin).href, input);
	try {
		await sendReport(await oauth.restore(did), body);
	} catch (cause) {
		console.warn('[report] failed', cause instanceof Error ? cause.message : cause);
		const status = cause instanceof ReportError && cause.status === 429 ? 429 : 502;
		return json({ error: status === 429 ? 'rateLimited' : 'failed' }, { status });
	}
	return new Response(null, { status: 204 });
};
