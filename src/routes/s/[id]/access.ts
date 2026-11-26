import type { Space } from '#lib/server/spaces/model.ts';
import type { Role } from '#lib/server/spaces/livekit.ts';

/**
 * 閲覧者から見た Space の見え方。botたんSpace はホスト以外には存在しないものと
 * 同じに見せる（LIFE-02・ACC-03）。
 */
export function visibleTo(space: Space | undefined, did: string | undefined): Space | undefined {
	if (!space) return undefined;
	if (space.kind === 'bot' && space.hostDid !== did) return undefined;
	return space;
}

/** 入室時のロール。スピーカーへの変更は発話の承認（作業5.2）で行う。 */
export function initialRole(space: Space, did: string): Role {
	return space.hostDid === did ? 'host' : 'listener';
}
