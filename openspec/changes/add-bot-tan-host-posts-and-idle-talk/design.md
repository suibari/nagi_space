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

### D5. パブリックSpace では投稿を渡さないことを二重に守る

Nagi Space の口（D1）がパブリックSpace では空を返し、convo の `space` は `accept_context` を持たないので、渡しても使わない。

## Risks / Trade-offs

- [botたんが投稿の内容を取り違えて決めつける] → 文脈の前置きで「決めつけない」と指示し、7日・20件に絞る。
- [ホストが投稿に触れられたくない] → botたんSpace はホストが自分で始める二人きりの場で、公開の投稿だけを使う。こっそり・CW・ラベル付きは除く。困る声があれば、Space 開始時に切れる設定を別の change で検討する。
- [記憶の体験を、目の前の相手の話と取り違える] → 体験は botたん自身の行動だけに絞り、知識は別枠で1件に限る。
- [沈黙の話しかけがうるさい] → 60秒・2分あける。人が話せばすぐ譲る。
- [PDS が遅い] → 3秒で諦めて投稿なしで始める。botたんの参加は待たせない。

## Migration Plan

convo（`nagi-space` の続きのブランチ）を先に出してから、Nagi Space と space-agent を出す。古い convo に `context` を送っても無視されるだけで、会話は作れる（未知の項目を拒否していないことを確かめる）。
