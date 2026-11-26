import { renderOg } from '#lib/server/og.ts';
import type { RequestHandler } from './$types';

/** 共通の OGP 画像（LOOK-04）。 */
export const GET: RequestHandler = () => renderOg();
