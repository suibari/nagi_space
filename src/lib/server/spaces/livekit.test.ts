import { TrackSource } from 'livekit-server-sdk';
import { describe, expect, it } from 'vitest';
import { grantsFor, participantMetadata, withRole } from './livekit';

describe('grantsFor', () => {
	it('ホストとスピーカーはマイクだけを送れる', () => {
		for (const role of ['host', 'speaker'] as const) {
			expect(grantsFor(role, 'room')).toMatchObject({
				canPublish: true,
				canPublishSources: [TrackSource.MICROPHONE],
				canSubscribe: true
			});
		}
	});

	it('聴衆は音声を送れない（PART-01）', () => {
		expect(grantsFor('listener', 'room')).toMatchObject({
			canPublish: false,
			canPublishSources: [],
			canSubscribe: true
		});
	});

	it('利用者は誰もデータを送れず、自分のメタデータも変えられない', () => {
		for (const role of ['host', 'speaker', 'listener'] as const) {
			expect(grantsFor(role, 'room')).toMatchObject({
				canPublishData: false,
				canUpdateOwnMetadata: false
			});
		}
	});
});

describe('participantMetadata', () => {
	it('ロールとアイコンを入れる。https 以外のアイコンは入れない', () => {
		expect(JSON.parse(participantMetadata('listener', 'https://cdn.test/a.jpg'))).toEqual({
			role: 'listener',
			avatar: 'https://cdn.test/a.jpg'
		});
		expect(JSON.parse(participantMetadata('host', 'javascript:alert(1)'))).toEqual({
			role: 'host'
		});
		expect(JSON.parse(participantMetadata('host'))).toEqual({ role: 'host' });
	});

	it('ロールを変えてもアイコンを残す', () => {
		const before = participantMetadata('listener', 'https://cdn.test/a.jpg');
		expect(JSON.parse(withRole(before, 'speaker'))).toEqual({
			role: 'speaker',
			avatar: 'https://cdn.test/a.jpg'
		});
		expect(JSON.parse(withRole('not json', 'speaker'))).toEqual({ role: 'speaker' });
	});
});
