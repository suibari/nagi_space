import {
	DisconnectReason,
	Room,
	RoomEvent,
	Track,
	type Participant,
	type RemoteTrack
} from 'livekit-client';

export type Role = 'host' | 'speaker' | 'listener';

const CONTROL_TOPIC = 'nagi-space.control';
const REACTION_TOPIC = 'nagi-space.reaction';
export type ConnectionState =
	'connecting' | 'reconnecting' | 'connected' | 'disconnected' | 'ended' | 'removed';

export type ParticipantView = {
	identity: string;
	name: string;
	role: Role;
	speaking: boolean;
	micOn: boolean;
	isLocal: boolean;
};

function roleOf(participant: Participant): Role {
	try {
		const role = JSON.parse(participant.metadata ?? '{}').role;
		return role === 'host' || role === 'speaker' ? role : 'listener';
	} catch {
		return 'listener';
	}
}

/** LiveKit の room をつなぎ、画面に出す状態を runes で持つ。 */
export class SpaceConnection {
	state = $state<ConnectionState>('connecting');
	participants = $state<ParticipantView[]>([]);
	/** ブラウザの自動再生の制限で音声を再生できないとき false（PART-02） */
	canPlayAudio = $state(true);
	micOn = $state(false);
	/** 自分のロール。サーバーが変えると更新される（PART-03・04・06） */
	localRole = $state<Role>('listener');
	/** サーバーからの制御の通知（発話のリクエストの変化など）を受けたときに呼ぶ */
	onControl?: (message: { type: string; reason?: string }) => void;
	/** リアクションを受けたときに呼ぶ（REACT-01） */
	onReaction?: (message: unknown) => void;

	readonly #room = new Room({ adaptiveStream: true, dynacast: true });
	readonly #audio = new Map<string, HTMLMediaElement>();

	constructor(private readonly audioContainer: HTMLElement) {
		const refresh = () => this.#refresh();
		this.#room
			.on(RoomEvent.ParticipantConnected, refresh)
			.on(RoomEvent.ParticipantDisconnected, refresh)
			.on(RoomEvent.ParticipantMetadataChanged, refresh)
			.on(RoomEvent.ParticipantPermissionsChanged, refresh)
			.on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
				// サーバーからの通知だけを受け付ける（利用者はデータを送れない。design.md D3）
				if (participant) return;
				try {
					const message = JSON.parse(new TextDecoder().decode(payload));
					if (topic === CONTROL_TOPIC) this.onControl?.(message);
					else if (topic === REACTION_TOPIC) this.onReaction?.(message);
				} catch {
					/* 壊れた通知は無視する */
				}
			})
			.on(RoomEvent.ActiveSpeakersChanged, refresh)
			.on(RoomEvent.TrackMuted, refresh)
			.on(RoomEvent.TrackUnmuted, refresh)
			.on(RoomEvent.LocalTrackPublished, refresh)
			.on(RoomEvent.TrackSubscribed, (track) => {
				this.#attach(track);
				refresh();
			})
			.on(RoomEvent.TrackUnsubscribed, (track) => {
				track.detach().forEach((element) => element.remove());
				refresh();
			})
			.on(RoomEvent.AudioPlaybackStatusChanged, () => {
				this.canPlayAudio = this.#room.canPlaybackAudio;
			})
			.on(RoomEvent.Reconnecting, () => (this.state = 'reconnecting'))
			.on(RoomEvent.Reconnected, () => {
				this.state = 'connected';
				this.#refresh();
			})
			.on(RoomEvent.Disconnected, (reason) => {
				// ホストが終了すると room が消える（LIFE-05）
				// ホストに退室させられると PARTICIPANT_REMOVED になる（PART-06）
				this.state =
					reason === DisconnectReason.ROOM_DELETED
						? 'ended'
						: reason === DisconnectReason.PARTICIPANT_REMOVED
							? 'removed'
							: 'disconnected';
			});
	}

	async connect(url: string, token: string): Promise<void> {
		this.state = 'connecting';
		await this.#room.connect(url, token, { autoSubscribe: true });
		this.state = 'connected';
		this.canPlayAudio = this.#room.canPlaybackAudio;
		this.#refresh();
	}

	/** マイクの許可は、初めてオンにするときに求める（PART-02・PART-03）。 */
	async setMic(on: boolean): Promise<void> {
		await this.#room.localParticipant.setMicrophoneEnabled(on);
		this.micOn = this.#room.localParticipant.isMicrophoneEnabled;
		this.#refresh();
	}

	async startAudio(): Promise<void> {
		await this.#room.startAudio();
		this.canPlayAudio = this.#room.canPlaybackAudio;
	}

	async disconnect(): Promise<void> {
		await this.#room.disconnect();
		this.#audio.forEach((element) => element.remove());
		this.#audio.clear();
	}

	#attach(track: RemoteTrack) {
		if (track.kind !== Track.Kind.Audio) return;
		const element = track.attach();
		this.audioContainer.appendChild(element);
	}

	#refresh() {
		const role = roleOf(this.#room.localParticipant);
		if (role === 'listener' && this.micOn) {
			// 聴衆に戻ったらマイクを止める
			void this.#room.localParticipant.setMicrophoneEnabled(false);
			this.micOn = false;
		}
		this.localRole = role;
		// ホストにミュートされたときも表示を合わせる（本人は解除できる。PART-06）
		this.micOn = this.#room.localParticipant.isMicrophoneEnabled;
		const all: Participant[] = [
			this.#room.localParticipant,
			...this.#room.remoteParticipants.values()
		];
		this.participants = all.map((participant) => ({
			identity: participant.identity,
			name: participant.name || participant.identity,
			role: roleOf(participant),
			speaking: participant.isSpeaking,
			micOn: participant.isMicrophoneEnabled,
			isLocal: participant === this.#room.localParticipant
		}));
	}
}
