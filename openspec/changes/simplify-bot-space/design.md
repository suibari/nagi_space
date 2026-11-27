# Design

## Context

- Nagi Space は `/agent/sync` で、開催中のすべての Space について字幕用のトークン（見えない参加者 `agent:captions`、購読だけ）を、botたんを頼まれた Space には botたん用のトークン（見える参加者 `bot:bot-tan`、マイクの送信だけ）を返す（`src/lib/server/bot/agent.ts`）。
- space-agent は Space ごとに `SpaceWorker` を持ち、`CaptionsWorker`（字幕用の room の接続）と、頼まれたら `BotWorker`（botたん用の別の room の接続）を動かす。字幕で聞き取った「名前: 発話」を `BotWorker` に渡している。
- 画面は、字幕と botたんの動きのデータを `agent:captions` と `bot:bot-tan` のどちらから届いても受け付ける（`room.svelte.ts` の `AGENT_IDENTITIES`）。
- botたんの参加者が抜けると、Webhook で botたんの招待を取り消し、ホストに `bot.left` を送っている。

## Decisions

### D1. botたんSpace には botたん用のトークンだけを返し、購読もできるようにする

- `/agent/sync` は、botたんSpace では字幕用のトークンを返さず、botたん用のトークンだけを返す。botたんSpace の botたん用のトークンは、マイクの送信に加えて購読（`canSubscribe`）も許す。パブリックSpace の botたん用のトークンは今のまま（購読しない）。
- botたんSpace は開始時に botたんを招待するので（LIFE-02）、通常は常に botたん用のトークンがある。障害で招待が取り消されている間は、トークンが無く、space-agent は何も接続しない（字幕も止まる。BOT-06）。

### D2. space-agent は botたんSpace で1つの room の接続を字幕と botたんで共用する

- `CaptionsWorker` に、自分で接続せず渡された room を使う形を足す。botたんSpace では `BotWorker` が room に接続し、その room を `CaptionsWorker` に渡す。
- `CaptionsWorker` は今どおり、ホストとスピーカーの声だけを購読して convo の字幕だけのつなぎへ送り、確定した字幕を同じ room から配る。botたん自身の声は購読しない（ロールが `bot` の参加者は対象外）。
- `SpaceWorker` は種類で分ける。パブリックSpace は今どおり（字幕は常に、botたんは頼まれたら）。botたんSpace は「botたん用のトークンがある間だけ、botたんと字幕を一緒に動かす」。
- convo の字幕だけのつなぎの枠（`max_transcribe`）は今どおり1つ使う。

### D3. 除外はサーバーで拒否し、画面では出さない

- `POST /s/[id]/bot` の `remove` は、botたんSpace なら 403 を返す。
- `BotControls` は、botたんSpace では「botたんに抜けてもらう」を出さない。botたんが参加していないとき（障害で `bot.left` を受けたあと）は「もう一度呼ぶ」を出す。呼ぶ処理は今の招待（`invite`）を使う。

### D4. botたんSpace の名前

- 開始画面で botたんSpace を選んだら、タイトルの入力欄を隠し、送らない。サーバーは botたんSpace のときタイトルを確かめず、開催情報に決まった名前「botたんとおしゃべり」を入れる。
- 画面の見出しとタブは、種類が botたんSpace なら保存された名前ではなく、表示中の言語の決まった名前（日本語「botたんとおしゃべり」、英語「Chat with bot-tan」）を出す。

## Risks / Trade-offs

- [botたんが落ちると字幕も止まる] → botたんSpace は人間がホスト1人で、字幕を読む相手は botたんとホスト本人だけ。「もう一度呼ぶ」で戻る。
- [1つの接続に字幕と声をまとめた分、space-agent の作りが種類で分かれる] → 種類ごとの違いは `SpaceWorker` の中に閉じ、`CaptionsWorker` と `BotWorker` は room を受け取れるようにするだけにとどめる。
- [デプロイの途中で、古い space-agent が新しい同期の形を受け取る] → 古い space-agent は字幕用のトークンが無い botたんSpace を受け持てない。Nagi Space と space-agent は続けて更新する（自宅の space-agent の再起動だけで済む）。

## Migration Plan

Nagi Space をデプロイしたら、すぐ自宅の space-agent を再起動する。開催中の botたんSpace は、切り替えの間だけ字幕が途切れることがある。
