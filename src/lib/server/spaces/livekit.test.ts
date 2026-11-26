import { TrackSource } from 'livekit-server-sdk';
import { describe, expect, it } from 'vitest';
import { grantsFor } from './livekit';

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
