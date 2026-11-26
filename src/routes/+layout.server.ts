import { getRuntime } from '#lib/server/runtime.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => ({
	/** OGP の絶対URLに使う正規の origin */
	origin: (await getRuntime()).auth.origin,
	did: locals.did,
	nagiUser: locals.nagiUser,
	locale: locals.locale
});
