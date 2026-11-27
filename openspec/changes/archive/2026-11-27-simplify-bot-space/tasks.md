# Tasks

## 1. 名前と除外（LIFE-01・BOT-01、design.md D3・D4）

- [x] 1.1 開始画面で botたんSpace を選んだらタイトルの入力欄を隠し、サーバーは botたんSpace のときタイトルを確かめずに決まった名前を入れる。Space画面の見出しとタブは、botたんSpace なら表示中の言語の決まった名前を出す（完了の確認：E2E で、botたんSpace はタイトルなしで始められ、見出しが「botたんとおしゃべり」（英語では「Chat with bot-tan」）になり、パブリックSpace は今どおりタイトルが必須であることが通る）
- [x] 1.2 botたんSpace では「botたんに抜けてもらう」を出さず、`POST /s/[id]/bot` の `remove` を 403 にする。botたんが参加していないときは「もう一度呼ぶ」を出す（完了の確認：E2E で、botたんSpace に除外の操作が無く、API でも拒否されること、パブリックSpace では今どおり除外できることが通る）

## 2. 参加者を1つにまとめる（BOT-06・TRANS-01、design.md D1・D2）

- [x] 2.1 `/agent/sync` が botたんSpace では字幕用のトークンを返さず、購読もできる botたん用のトークンだけを返す（完了の確認：単体テストかE2E で、botたんSpace の同期のジョブに字幕用のトークンが無く、botたん用のトークンが購読を許すこと、パブリックSpace は今どおりであることが通る）
- [x] 2.2 space-agent で、botたんSpace では `BotWorker` の room を `CaptionsWorker` と共用し、botたん用のトークンがある間だけ両方を動かす（完了の確認：space-agent の pytest と E2E で、botたんSpace に入る space-agent の参加者が botたん1人だけであること、ホストの発話が字幕になり botたんが返事をすること、botたんが落ちると字幕が止まり「もう一度呼ぶ」で戻ることが通る）

## 3. 結合確認

- [x] 3.1 型チェック・単体テスト・E2E・space-agent の pytest・Prettier・OpenSpec の検証をすべて流す（完了の確認：すべて通る）
  - 2026-11-27 すべて通った（型チェック 0件、単体テスト 109件、E2E 95件、space-agent の pytest 10件、Prettier、OpenSpec 12件）。

## Workflow follow-up

- Nagi Space のデプロイの直後に、自宅の space-agent を再起動する。
- 実装完了後、主仕様（openspec/specs/）へ同期し、change をアーカイブする。
