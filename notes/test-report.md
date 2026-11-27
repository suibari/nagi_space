# 通し試験と要件ごとの確認（作業11.1）

2026-11-27 に開発環境（Docker の LiveKit 1.13・PostgreSQL・PostgREST、偽の AppView、偽の convo と本物の space-agent）で実行した。

## 実行結果

| 種類                                         | 件数 | 結果                                                   |
| -------------------------------------------- | ---- | ------------------------------------------------------ |
| ユニット・コンポーネント（Vitest）           | 74   | すべて成功                                             |
| 統合（実際の PostgREST・LiveKit）            | 25   | すべて成功                                             |
| space-agent（pytest）                        | 6    | すべて成功                                             |
| E2E（Playwright）                            | 70   | すべて成功（2026-11-27 に BOT-06 の2件を足して再実行） |
| bot-tan-convo（pytest、ブランチ nagi-space） | 92   | すべて成功                                             |

通し試験（`tests/e2e/integration.e2e.ts`）：ホストが作成 → スピーカーが一覧から入室・発話をリクエスト → ホストが承認 → スピーカーの発話が字幕になる → ホストが botたんを呼ぶ → botたんが名前付きの発話に返事し、字幕と動きが届く → 聴衆が絵文字を送る → ホストがスピーカーをミュート → ホストが終了し、全員が終了の表示になり、参加者と発話の記録が消える。

## 本物では確かめていないこと

- 実際の PDS でのログインとシェア（作業3.7、手動確認）
- 本物の bot-tan-convo（GPU・音声認識・TTS）とつないだ botたんの会話と字幕（偽の convo で代用）
- Nagi AppView の拡張した通報 API（bsky-affirmative-bot のブランチ nagi-space-report、未デプロイ）
- LiveKit Cloud・自宅の PostgREST・Vercel での動作（作業2.3・2.5・2.6）

## 要件ごとのテスト

要件IDをテストのコメントに書いたものを数えた。シナリオの全部を自動テストで確かめたことを示すものではない。

| 分野                | 要件                                              | 確かめるテスト                                                                                                                                      |
| ------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| bot-tan-presence    | BOT-01 botたんの招待と除外                        | `tests/e2e/bot.e2e.ts`, `tests/e2e/integration.e2e.ts`                                                                                              |
| bot-tan-presence    | BOT-02 convoの空きが無いとき                      | `tests/e2e/bot.e2e.ts`                                                                                                                              |
| bot-tan-presence    | BOT-03 話者ごとの名前付きの発話で会話する         | `tests/e2e/bot.e2e.ts`, `tests/e2e/integration.e2e.ts`                                                                                              |
| bot-tan-presence    | BOT-04 人間が話し始めたら譲る                     | `tests/e2e/bot.e2e.ts`                                                                                                                              |
| bot-tan-presence    | BOT-05 3Dモデルの表示                             | `tests/e2e/avatar-nowebgl.e2e.ts`, `tests/e2e/avatar.e2e.ts`, `tests/e2e/integration.e2e.ts`                                                        |
| bot-tan-presence    | BOT-06 convoの障害                                | `tests/e2e/bot.e2e.ts`・`tests/e2e/space-create.e2e.ts`                                                                                             |
| bot-tan-presence    | BOT-07 Spaceの会話はbotたんの記憶に残さない       | （テストに要件IDの記載なし）                                                                                                                        |
| space-access        | ACC-01 AT Protocol OAuthによるログイン            | `tests/e2e/did-hint.e2e.ts`                                                                                                                         |
| space-access        | ACC-02 Nagi登録済みの利用者に限る                 | `tests/e2e/registration.e2e.ts`                                                                                                                     |
| space-access        | ACC-03 ログインしていない閲覧者                   | `tests/e2e/anonymous.e2e.ts`, `tests/e2e/space-create.e2e.ts`                                                                                       |
| space-access        | ACC-04 セッションの復元とログアウト               | `tests/e2e/session.e2e.ts`                                                                                                                          |
| space-access        | ACC-05 年齢による制限をしない                     | `tests/e2e/space-create.e2e.ts`                                                                                                                     |
| space-appearance    | LOOK-01 Nagiのデフォルトテーマに合わせる          | `tests/e2e/appearance.e2e.ts`                                                                                                                       |
| space-appearance    | LOOK-02 ライト・ダークの切り替え                  | `tests/e2e/appearance.e2e.ts`                                                                                                                       |
| space-appearance    | LOOK-03 faviconとアプリアイコン                   | `tests/e2e/appearance.e2e.ts`                                                                                                                       |
| space-appearance    | LOOK-04 OGP                                       | `tests/e2e/og.e2e.ts`                                                                                                                               |
| space-appearance    | LOOK-05 スマートフォンでの画面配置                | `tests/e2e/appearance.e2e.ts`                                                                                                                       |
| space-appearance    | LOOK-06 日本語と英語の表示                        | `src/lib/i18n/hardcoded.test.ts`, `tests/e2e/appearance.e2e.ts`                                                                                     |
| space-lifecycle     | LIFE-01 Spaceの作成                               | `src/lib/server/spaces/repository.integration.test.ts`, `tests/e2e/integration.e2e.ts`, `tests/e2e/space-create.e2e.ts`                             |
| space-lifecycle     | LIFE-02 botたんSpaceは完全に非公開                | `tests/e2e/bot.e2e.ts`, `tests/e2e/space-create.e2e.ts`                                                                                             |
| space-lifecycle     | LIFE-03 開催中のSpaceの一覧                       | `tests/e2e/integration.e2e.ts`, `tests/e2e/space-list.e2e.ts`                                                                                       |
| space-lifecycle     | LIFE-04 開始時のNagiへのシェア                    | `tests/e2e/space-share.e2e.ts`                                                                                                                      |
| space-lifecycle     | LIFE-05 ホストによる終了                          | `tests/e2e/integration.e2e.ts`, `tests/e2e/space-end.e2e.ts`                                                                                        |
| space-lifecycle     | LIFE-06 ホストの切断と退室                        | `src/lib/server/spaces/lifecycle.integration.test.ts`, `src/lib/server/spaces/limits.test.ts`, `tests/e2e/space-limits.e2e.ts`                      |
| space-lifecycle     | LIFE-07 終了後に何も残さない                      | `src/lib/server/spaces/repository.integration.test.ts`, `tests/e2e/integration.e2e.ts`, `tests/e2e/moderation.e2e.ts`, `tests/e2e/space-end.e2e.ts` |
| space-lifecycle     | LIFE-08 人数の上限                                | `src/lib/server/spaces/limits.test.ts`, `tests/e2e/space-limits.e2e.ts`, `tests/e2e/stage.e2e.ts`                                                   |
| space-lifecycle     | LIFE-09 開催時間の上限                            | `src/lib/server/spaces/lifecycle.integration.test.ts`, `src/lib/server/spaces/limits.test.ts`, `tests/e2e/space-limits.e2e.ts`                      |
| space-participation | PART-01 ロール                                    | `src/lib/server/spaces/livekit.test.ts`, `tests/e2e/listener.e2e.ts`                                                                                |
| space-participation | PART-02 入室                                      | `tests/e2e/autoplay.e2e.ts`, `tests/e2e/listener.e2e.ts`                                                                                            |
| space-participation | PART-03 発話のリクエストと承認                    | `tests/e2e/integration.e2e.ts`, `tests/e2e/stage.e2e.ts`                                                                                            |
| space-participation | PART-04 スピーカーの操作                          | `tests/e2e/stage.e2e.ts`                                                                                                                            |
| space-participation | PART-05 パブリックSpaceは常に誰でも入れる場にする | `src/lib/server/spaces/admission.test.ts`, `tests/e2e/open-space.e2e.ts`                                                                            |
| space-participation | PART-10 利用者どうしの個別メッセージを提供しない  | `tests/e2e/reactions.e2e.ts`                                                                                                                        |
| space-participation | PART-06 ホストのモデレーション                    | `tests/e2e/integration.e2e.ts`, `tests/e2e/moderation.e2e.ts`, `tests/e2e/stage.e2e.ts`                                                             |
| space-participation | PART-07 運営への通報                              | `src/lib/server/report.test.ts`, `tests/e2e/report.e2e.ts`                                                                                          |
| space-participation | PART-08 切断と再接続                              | `tests/e2e/reconnect.e2e.ts`                                                                                                                        |
| space-participation | PART-09 Nagiのミュートは自分から見えなくするだけ  | `tests/e2e/mutes.e2e.ts`, `tests/e2e/reactions.e2e.ts`                                                                                              |
| space-reactions     | REACT-01 絵文字を送る                             | `tests/e2e/integration.e2e.ts`, `tests/e2e/reactions.e2e.ts`                                                                                        |
| space-reactions     | REACT-02 選べる絵文字はNagiのパレットと同じ       | `src/lib/server/spaces/reactions.test.ts`, `tests/e2e/reactions.e2e.ts`                                                                             |
| space-reactions     | REACT-03 連続送信の制限                           | `tests/e2e/reactions.e2e.ts`                                                                                                                        |
| space-reactions     | REACT-04 リアクションを残さない                   | `tests/e2e/reactions.e2e.ts`                                                                                                                        |
| space-transcription | TRANS-01 全スピーカーの常時文字起こし             | `tests/e2e/bot.e2e.ts`, `tests/e2e/integration.e2e.ts`                                                                                              |
| space-transcription | TRANS-02 文字起こし中であることの表示             | `tests/e2e/bot.e2e.ts`, `tests/e2e/stage.e2e.ts`                                                                                                    |
| space-transcription | TRANS-03 混雑時の優先度                           | `tests/e2e/bot.e2e.ts`                                                                                                                              |
| space-transcription | TRANS-04 字幕を保存しない                         | `tests/e2e/bot.e2e.ts`                                                                                                                              |
| space-transcription | TRANS-05 文字起こしの対象から外せない             | `tests/e2e/bot.e2e.ts`                                                                                                                              |

要件IDの記載が無いもの：BOT-07

- BOT-07 は、convo に記憶へ書き込む処理が無く、Space 用の使い方の `memory_sources` が空であることで満たしている（作業8.7。コードの確認で、E2E テストは無い）。
