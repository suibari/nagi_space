import { db } from './fixtures/session.ts';

/**
 * E2E の前に、前回までのテストが残した Space の記録を消す。開発用の保存先は使い回すので、
 * 終わらずに残った Space があると、space-agent が字幕の上限まで古い Space を受け持ってしまう。
 */
export default async function globalSetup() {
	for (const prefix of ['space:', 'bot:', 'nagi:']) {
		const rows = await db.list(prefix);
		for (let i = 0; i < rows.length; i += 100) {
			await db.del(...rows.slice(i, i + 100).map((row) => row.key));
		}
	}
}
