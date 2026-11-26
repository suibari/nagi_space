import { AccessToken, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
import type { ServiceConfig } from '../config';
import { livekitHttpUrl } from '../services';
import type { SpaceLimits } from './limits';
import type { Space } from './model';

export type Role = 'host' | 'speaker' | 'listener';

const TOKEN_TTL_SECONDS = 60 * 60 * 6;

/** ロールごとの権限（design.md D3）。利用者は誰もデータを送れない（偽の字幕・リアクション対策）。 */
export function grantsFor(role: Role, room: string) {
	const canSpeak = role === 'host' || role === 'speaker';
	return {
		room,
		roomJoin: true,
		canSubscribe: true,
		canPublish: canSpeak,
		canPublishSources: canSpeak ? [TrackSource.MICROPHONE] : [],
		canPublishData: false,
		canUpdateOwnMetadata: false
	};
}

export class SpaceRooms {
	readonly rooms: RoomServiceClient;

	constructor(
		private readonly config: ServiceConfig['livekit'],
		private readonly limits: SpaceLimits
	) {
		this.rooms = new RoomServiceClient(livekitHttpUrl(config.url), config.apiKey, config.apiSecret);
	}

	get url(): string {
		return this.config.url;
	}

	async createRoom(space: Space): Promise<void> {
		await this.rooms.createRoom({
			name: space.id,
			// 誰もいなくなった room は LiveKit 側でも片付ける。Space の終了判定は Webhook で行う（作業4.2〜4.4）
			emptyTimeout: 10 * 60,
			// 入室者の上限（LIFE-08）の最後の砦。space-agent の分を足す
			maxParticipants: this.limits.maxEntrants + 3,
			metadata: JSON.stringify({ kind: space.kind, hostDid: space.hostDid })
		});
	}

	async deleteRoom(id: string): Promise<void> {
		await this.rooms.deleteRoom(id).catch(() => undefined);
	}

	async issueToken(input: {
		space: Space;
		did: string;
		name: string;
		role: Role;
	}): Promise<string> {
		const token = new AccessToken(this.config.apiKey, this.config.apiSecret, {
			identity: input.did,
			name: input.name,
			metadata: JSON.stringify({ role: input.role }),
			ttl: TOKEN_TTL_SECONDS
		});
		token.addGrant(grantsFor(input.role, input.space.id));
		return token.toJwt();
	}
}
