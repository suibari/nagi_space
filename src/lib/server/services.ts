import { RoomServiceClient } from 'livekit-server-sdk';
import type { ServiceConfig } from './config';
import { PostgrestStore } from './store/postgrest';
import type { KeyValueStore } from './store/types';

/** LiveKit の Server API は http(s) で呼ぶ。設定は ws(s) でも受け付ける。 */
export function livekitHttpUrl(url: string): string {
	return url.replace(/^ws(s?):\/\//, 'http$1://');
}

export function createRoomService(config: ServiceConfig): RoomServiceClient {
	const { url, apiKey, apiSecret } = config.livekit;
	return new RoomServiceClient(livekitHttpUrl(url), apiKey, apiSecret);
}

export function createStore(config: ServiceConfig): KeyValueStore {
	return new PostgrestStore(config.db);
}
