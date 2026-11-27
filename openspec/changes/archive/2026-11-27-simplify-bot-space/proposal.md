# Proposal

## Why

botたんSpace は、ホストが botたんと二人きりで話すための場である。今は、パブリックSpace と同じ作りのまま次の3つが残っている（2026-11-27 利用者の指摘）。

- botたんを外す操作がある。二人きりの場で botたんを外す使い道が無い。
- 名前の入力を求める。一覧にも出ず、誰にも見せない場なので、名前は要らない。
- LiveKit の接続を3人分（ホスト・字幕用・botたん）使っている。無料枠（参加者の接続時間）がもったいない。

## What Changes

- **botたんを外す操作を出さない**：botたんSpace では「botたんに抜けてもらう」を出さず、サーバーも受け付けない。convo の障害で botたんが落ちたとき（BOT-06）だけ、「もう一度呼ぶ」を出す。
- **名前を入れない**：開始画面で botたんSpace を選んだら、タイトルの入力欄を出さない。画面の見出しとブラウザのタブには、決まった名前（「botたんとおしゃべり」、英語は「Chat with bot-tan」）を出す。
- **参加者を1つにまとめる**：space-agent は botたんSpace に、見える botたん1人だけで入り、ホストの声の聞き取り（字幕）と botたんの声の両方を受け持つ。LiveKit の接続時間は1分あたり3人分から2人分に減る。
- **字幕は botたんがいる間だけ**：まとめた結果、botたんが障害で落ちている間は字幕も止まる。botたんSpace は人間がホスト1人なので、「人間どうしの会話と字幕は止めない」から外す。「もう一度呼ぶ」で両方戻る。

## Capabilities

### New Capabilities

なし。

### Modified Capabilities

- `space-lifecycle`：LIFE-01（botたんSpace はタイトルを入れず、決まった名前にする）。
- `bot-tan-presence`：BOT-01（botたんSpace では除外できない）、BOT-06（botたんSpace では障害の間は字幕も止まる、「もう一度呼ぶ」）。
- `space-transcription`：TRANS-01（botたんSpace では botたんが参加している間だけ字幕にする）。

## 非対象

- パブリックSpace の参加者をまとめること（botたんが途中で出入りし、字幕は常に続ける必要があるため。使用量を見て必要なら別に扱う）
- botたんSpace を LiveKit を使わずに convo へ直接つなぐこと
- botたんSpace の名前をあとから付ける操作

## 影響

- **本リポジトリ**：開始画面と作成の処理（`src/routes/spaces/new/`）、Space画面の見出し（`src/routes/s/[id]/`）、botたんの操作（`src/lib/space/BotControls.svelte`、`src/routes/s/[id]/bot/`）、space-agent との同期のトークン（`src/lib/server/bot/agent.ts`、`src/routes/agent/sync/`）、space-agent（`agent/space_agent/`）、日英の文言、E2E。
- **外部リポジトリ・外部サービス**：変更なし。LiveKit Cloud の接続時間が botたんSpace で約3分の2になる。
