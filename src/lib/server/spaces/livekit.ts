import { AccessToken, DataPacket_Kind, RoomServiceClient, TrackSource } from 'livekit-server-sdk';
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

/** サーバーから画面へ送る制御の通知の topic。利用者が書いた内容は載せない（design.md D8）。 */
export const CONTROL_TOPIC = 'nagi-space.control';

export type ControlMessage =
	| { type: 'stage.changed' }
	| { type: 'stage.offer'; reason: 'approved' | 'invited' }
	| { type: 'bot.left' };

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

	/** ロールを変える。権限は丸ごと置き換わるので、ロールの権限をすべて渡す（design.md D3）。 */
	async setRole(spaceId: string, identity: string, role: Role): Promise<void> {
		const { canPublish, canPublishSources, canSubscribe, canPublishData, canUpdateOwnMetadata } =
			grantsFor(role, spaceId);
		await this.rooms.updateParticipant(spaceId, identity, {
			metadata: JSON.stringify({ role }),
			permission: {
				canPublish,
				canPublishSources,
				canSubscribe,
				canPublishData,
				canUpdateMetadata: canUpdateOwnMetadata
			}
		});
	}

	/** スピーカーのマイクをミュートする。本人は自分で解除できる（PART-06）。 */
	async muteMicrophone(spaceId: string, identity: string): Promise<boolean> {
		const participant = (await this.rooms.listParticipants(spaceId)).find(
			(p) => p.identity === identity
		);
		const track = participant?.tracks.find((t) => t.source === TrackSource.MICROPHONE && !t.muted);
		if (!track) return false;
		await this.rooms.mutePublishedTrack(spaceId, identity, track.sid, true);
		return true;
	}

	/** 退室させる。持っているトークンでの再接続もできないようにする（PART-06）。 */
	async removeParticipant(spaceId: string, identity: string): Promise<void> {
		await this.rooms
			.removeParticipant(spaceId, identity, {
				revokeTokenTs: BigInt(Math.floor(Date.now() / 1000))
			})
			.catch(() => undefined);
	}

	/** 入室者全員へ送る（リアクション。REACT-01）。利用者が書いた文章は載せない。 */
	async broadcast(spaceId: string, topic: string, message: unknown): Promise<void> {
		await this.rooms.sendData(
			spaceId,
			new TextEncoder().encode(JSON.stringify(message)),
			DataPacket_Kind.RELIABLE,
			{ topic }
		);
	}

	/** 特定の参加者へ制御の通知を送る。 */
	async notify(spaceId: string, identities: string[], message: ControlMessage): Promise<void> {
		if (!identities.length) return;
		await this.rooms.sendData(
			spaceId,
			new TextEncoder().encode(JSON.stringify(message)),
			DataPacket_Kind.RELIABLE,
			{
				destinationIdentities: identities,
				topic: CONTROL_TOPIC
			}
		);
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
