# Tasks

## 1. convo の変更【外部：bot-tan-convo】

- [x] 1.1 bot-tan-convo の作業用ブランチで、`POST /v1/sessions` に `context` を足し、使い方の `accept_context` が真のときだけ人物設定の後ろに足す（design.md D3）（完了の確認：convo の pytest で、`accept_context` の有無で文脈が足される・足されないこと、4,000字を超えると 400 になることが通る）
- [x] 1.2 話しかけの指示文を使い方ごとに設定できるようにし（`idle_nudge`）、`space` と `space_bot` に Space 用の指示文と `proactive = { idle_s = 60, min_gap_s = 120 }` を設定する。`space_bot` だけ `accept_context = true`（完了の確認：convo の pytest で、使い方の指示文で話しかけること、60秒の沈黙で話しかけて2分は次をしないことが通る）

- [x] 1.3 記憶の引き方（`Recall`）を、`web_research` が含まれるときは体験（直近 `recall_days` 日）と知識（日付で絞らない・1件）の2回に分けて引くように変え、`space` と `space_bot` の `memory_sources` を `["biorhythm", "web_research"]` にする（design.md D4）（完了の確認：convo の pytest で、知識が別枠で1件入ること、ほかの人の投稿の種類を引かないこと、Bot Memory API に届かないと記憶なしで返事をすることが通る）

- [x] 1.4 `space` と `space_bot` に `bot_state = true`・`digest = true` を設定する（BOT-11、design.md D5）（完了の確認：convo の pytest で、Space 用の使い方で様子を聞くと `/bot/presence` が引かれ、会話の開始で日々のまとめが人物設定に足されることが通る）

## 2. Nagi Space（BOT-08、design.md D1・D2・D7）

- [x] 2.1 ホストの PDS から投稿を読み、直近7日・こっそり／CW／ラベル付きを除いて最大20件に整える処理を作る。本文はログに出さない（完了の確認：単体テストで、7日より古い・こっそり・CW・ラベル付きが除かれ、20件・200字に切られ、PDS が失敗・遅いと空になることが通る）
- [x] 2.2 `GET /agent/context/[spaceId]` を作る（AGENT_SECRET で守る。botたんSpace だけ投稿を返し、パブリックSpace は空）（完了の確認：E2E で、秘密が無いと 401、パブリックSpace は空、ホストの DID を解決できない botたんSpace も空で botたんが参加することが通る。botたんSpace で PDS の投稿が整えて返ることは単体テスト（`contextForSpace`）で確かめる。E2E の偽のホストの DID は PLC で解決できないため）

## 3. space-agent（BOT-08）

- [x] 3.1 botたんの会話を作るときに `/agent/context` を読み、convo の会話の作成に `context` として渡す。読めなければ渡さずに作る（完了の確認：space-agent の pytest で、botたんSpace では convo の会話の作成に文脈が入り、パブリックSpace と文脈が空のときは入らないこと、`/agent/context` が失敗すると空になり本文をログに出さないことが通る。E2E で、文脈が空でも botたんが参加することが通る）

## 4. 待機中の身振りと表情（BOT-05、design.md D6）

- [ ] 4.1 まばたき・表情・しぐさの時刻と値を決める計画の関数（`idlePlanner`）を作る（完了の確認：単体テストで、まばたきの間隔が2〜6秒に収まること、しぐさが30〜60秒おきで話している間は出ないこと、視差効果を減らす設定ではしぐさが出ないこと、表情の値が範囲に収まることが通る）
- [ ] 4.2 `avatar.ts` の毎フレームの処理に計画の関数をつなぎ、しぐさの途中で返事の動きが届いたら切り替える（完了の確認：型チェックが通り、自宅のブラウザで botたんがまばたき・表情の変化・しぐさをすることを確かめる（作業5.2））

## 5. 結合確認

- [ ] 5.1 型チェック・単体テスト・E2E・space-agent の pytest・Prettier・OpenSpec の検証をすべて流す（完了の確認：すべて通る）
- [ ] 5.2 自宅の本物の convo と WebGL の使えるブラウザで、botたんSpace でホストの最近の投稿に触れること、60秒の沈黙で話しかけること、話題から botたんの体験や知識を思い出すこと、元気かと聞くと様子を踏まえて答えること、待機中にまばたき・表情の変化・しぐさをすることを手動で確かめる（完了の確認：利用者が確かめた日付と結果をこの項目に書く）

## Workflow follow-up

- convo の変更を main に取り込んで起動し直し、Nagi Space をデプロイし、space-agent を再起動する（手順は notes/release-runbook.md）。
- 実装完了後、主仕様（openspec/specs/）へ同期し、change をアーカイブする。
