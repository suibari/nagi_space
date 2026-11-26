import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals }) => ({
	did: locals.did,
	nagiUser: locals.nagiUser,
	locale: locals.locale
});
