# Design

## Context

- botたんの参加は自宅の space-agent が行う。space-agent は数秒ごとに `/agent/sync` で Nagi Space と同期し、botたんを頼まれた Space ごとに convo の会話（使い方 `space` か `space_bot`、`key` は Space の ID）を作る（`agent/space_agent/bot.py`）。
- convo は会話の中で「黙っている時間を見て話しかける」仕組み（`proactive` の `idle_s`・`min_gap_s`）を持つ。ただし話しかけの指示文（`NUDGES["idle"]`）は配信用の固定の文面で、使い方ごとに変えられない。Space 用の使い方では `proactive` を設定していない。
- convo には、会話を作るときに外から文脈を渡す口が無い（`POST /v1/sessions` は `profile` と `key` だけ）。
- Nagi の投稿は、利用者のリポジトリの `com.suibari.nagi.post` のレコード（`text`・`createdAt`・`labels`・`cwRestricted`・`kossori` など）。Nagi の AppView には特定の人の投稿一覧を返す口が無いが、PDS の `com.atproto.repo.listRecords` は公開で、認証なしで新しい順に読める。

## Goals / Non-Goals

**Goals**

- ホストの投稿を、保存せずに botたんSpace の会話にだけ渡す。
- 沈黙時の話しかけを、Space に合った指示文で行う。

**Non-Goals**

- 投稿の検索や要約（botたんの LLM がそのまま読む）。
- Space の会話を記憶に書くこと（BOT-07）。

## Decisions

### D1. 投稿は space-agent が会話を作るときに Nagi Space から受け取る

- Nagi Space に `GET /agent/context/[spaceId]` を足す（`AGENT_SECRET` で守る）。botたんSpace なら、その場でホストの PDS から投稿を読み、整えて返す。パブリックSpace なら空を返す。
- `/agent/sync` に載せない理由：同期は数秒ごとなので、毎回 PDS を読むことになる。保存先に一時的に置くと「保存しない」（LIFE-07）に反する。会話を作るときに1回だけ読み、その場で渡して捨てる。
- space-agent は受け取った投稿を convo の会話の作成（D3）に渡し、自分では持たない。

### D2. 投稿の選び方と整え方

- ホストの DID から PDS を引き（OAuth で使っている解決の仕組みを使う）、`listRecords`（`collection=com.suibari.nagi.post`、`limit=50`）を新しい順に読む。
- `createdAt` が直近7日のもの、`kossori` が真でないもの、`cwRestricted` が真でないもの、`labels` が無いものだけを残し、新しい順に最大20件。
- 1件の本文は200字までに切り、日付（「3日前」）を付けて botたんへの文脈にする：「（ホストの〇〇さんが最近 Nagi に書いたこと。会話の話題にしてよいが、全部を読み上げたり、書いていないことを決めつけたりしない）」。
- PDS に届かない・3秒で返らないときは空にする（BOT-08 の「投稿を読めない」）。
- 本文はログに出さない。件数だけ出す。

### D3. convo の変更（外部リポジトリ：bot-tan-convo）

- `POST /v1/sessions` に `context`（文字列、4,000字まで）を足す。使い方の設定で `accept_context = true` のときだけ受け付け、人物設定の後ろに足す。同じ `key` の会話がすでにあれば、文脈は差し替えない。
- 話しかけの指示文を使い方ごとに設定できるようにする（`idle_nudge`）。Space 用は「しばらく会話がない。Space のタイトルや直前の会話から話題を一つ選び、みんなに向けて短く話しかける。質問は多くても一つ。特定の人の投稿には触れない（botたんSpace では、ホストの最近の投稿を話題にしてよい）」。
- `space` と `space_bot` に `proactive = { idle_s = 60, min_gap_s = 120 }` を設定する。`space_bot` だけ `accept_context = true`。
- 会話の「最後に話した時刻」は、字幕から届く文字と botたんの返事で更新されるので、Space でもそのまま使える。

### D4. 記憶は体験と知識を別枠で引く（BOT-10）

- convo の記憶の引き方（`Recall`）は、botたんが「思い出す必要がある」と判断したときだけ、つなぎの言葉を話しながら Bot Memory API の `/memory/search` を引く。Space 用の使い方の `memory_sources` を `["biorhythm", "web_research"]` にして有効にする。
- ただし今の `Recall` は種類をまとめて直近 `recall_days` 日に絞って引く。bot-tan-youtuber の実測（2026-09-02）では、知識（web_research）は件数の多いほかの種類に押し出されて上位に出てこなかった。また知識は日付で絞ると古いものが引けない。そこで convo の `Recall` を、`web_research` が含まれるときは「体験（直近 recall_days 日、従来どおり）」と「知識（日付で絞らない、1件）」の2回に分けて引くように変える。
- ほかの利用者の投稿の種類（`*_affirmed_post`・`*_received_reply`・リアクション・`youtube_live_comment`）は設定に入れない。convo の個人向けの使い方で「取り違えやすい」と判断した理由と、パブリックSpace でほかの人の投稿を場に持ち出さないためである。
- Bot Memory API の用途（`purpose`）は今の `live_reply` のまま。届かないとき（5秒）は記憶なしで返事をする（今の `Recall` の振る舞い）。

### D5. いまの様子と日々のまとめは convo の設定で入れる（BOT-11）

convo にはすでに、いまの様子を聞かれたときだけ Bot Memory API の `/bot/presence` を引いて添える仕組み（`bot_state`、指示文は `prompts/presence.txt`）と、会話を始めるときに日々のまとめ（`/memory/context` の recent、`digest_days` 日）を人物設定に足す仕組み（`digest`）がある。個人向けの使い方では有効で、Space 用では切ってある。`space` と `space_bot` に `bot_state = true`・`digest = true` を設定する。どちらも botたん自身のことだけで、ほかの利用者の情報は含まない。

### D6. 待機中の身振りと表情は画面側で作る（BOT-05）

- 今の `avatar.ts` は、話していない間は待機の動き（manifest の `idle`）を順に流すだけで、表情は口（`aa`）しか動かさない。
- 次の3つを、描画の毎フレームの処理に足す。どれも乱数で間隔をばらつかせ、時刻を引数にした小さな計画の関数（`idlePlanner`）に分けて単体テストできるようにする。
  - **まばたき**：2〜6秒おきに `blink` を 0→1→0（約0.15秒）。ときどき2回続ける。
  - **表情**：`relaxed` と `happy` の値をゆっくり動かし（0〜0.3）、20〜40秒おきに「ほほえみ」（`happy` を0.6まで上げて戻す）の山を作る。話している間は控えめにする。
  - **しぐさ**：話していない状態が続いたら、30〜60秒おきに作り置きの動き（`neutral`・`greeting`・`happy` のカテゴリ）から1つを1回流し、終わったら待機の動きに戻る。返事の動き（`bot.motion`）が届いたら、しぐさを打ち切ってそちらを流す。
- 視差効果を減らす設定（`prefers-reduced-motion: reduce`）では、しぐさだけを止める。
- ヘッドレスのブラウザでは WebGL が使えないので、見た目は手動で確かめる。計画の関数は単体テストで確かめる。

### D8. 割り込みの二段構え（BOT-04）

- convo の字幕だけのつなぎに、声が合わせて1秒続いたとき（`speech.confirmed`）と発話の区切り（`speech.end`）の知らせを足す（convo の変更。1秒は hello の `confirm_ms` で変えられる）。
- space-agent は、`speech.start` で botたんに「いったん止める」（`control: pause`）、`speech.confirmed` で「止める」（`control: interrupt`）、確定しないまま `speech.end` で「続ける」（`control: resume`）を送る。何人かが同時に話したときは、確定していない人が全員終わってから続ける。
- convo は `pause` のあと4秒指示が無ければ、自分で続きを話す（space-agent が落ちても黙ったままにしない）。
- 1秒は space-agent の環境変数（`BARGE_CONFIRM_MS`、既定 1000）で変えられる。

### D9. 目線（BOT-05）

convo の画面（`web/static/avatar.js` の `updateGaze`）と同じく、`VRMLookAtQuaternionProxy` を足して動き（VRMA）が目線を上書きしないようにし、`vrm.lookAt.target` をカメラのそばの点にする。1.5〜4秒ごとにカメラのまわりの少し違う点を見て、ときどき大きくそらして0.8〜1.4秒で戻す。目はすばやく追う。カメラを使わないので、見ている人の顔は追わない。

### D7. パブリックSpace では投稿を渡さないことを二重に守る

Nagi Space の口（D1）がパブリックSpace では空を返し、convo の `space` は `accept_context` を持たないので、渡しても使わない。

## Risks / Trade-offs

- [botたんが投稿の内容を取り違えて決めつける] → 文脈の前置きで「決めつけない」と指示し、7日・20件に絞る。
- [ホストが投稿に触れられたくない] → botたんSpace はホストが自分で始める二人きりの場で、公開の投稿だけを使う。こっそり・CW・ラベル付きは除く。困る声があれば、Space 開始時に切れる設定を別の change で検討する。
- [記憶の体験を、目の前の相手の話と取り違える] → 体験は botたん自身の行動だけに絞り、知識は別枠で1件に限る。
- [待機中の動きが多すぎて落ち着かない] → まばたき以外は数十秒おきに抑え、話している間は表情を控えめにする。
- [沈黙の話しかけがうるさい] → 60秒・2分あける。人が話せばすぐ譲る。
- [PDS が遅い] → 3秒で諦めて投稿なしで始める。botたんの参加は待たせない。

## Migration Plan

convo（`nagi-space` の続きのブランチ）を先に出してから、Nagi Space と space-agent を出す。古い convo に `context` を送っても無視されるだけで、会話は作れる（未知の項目を拒否していないことを確かめる）。
