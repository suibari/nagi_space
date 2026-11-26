import { RoomServiceClient } from 'livekit-server-sdk';
import { createClient, type RedisClientType } from 'redis';
import type { ServiceConfig } from './config';

/** LiveKit の Server API は http(s) で呼ぶ。設定は ws(s) でも受け付ける。 */
export function livekitHttpUrl(url: string): string {
	return url.replace(/^ws(s?):\/\//, 'http$1://');
}

export function createRoomService(config: ServiceConfig): RoomServiceClient {
	const { url, apiKey, apiSecret } = config.livekit;
	return new RoomServiceClient(livekitHttpUrl(url), apiKey, apiSecret);
}

export async function connectRedis(config: ServiceConfig): Promise<RedisClientType> {
	const client: RedisClientType = createClient({ url: config.redisUrl });
	await client.connect();
	return client;
}
