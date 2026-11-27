# Tasks

## 1. convo の変更【外部：bot-tan-convo】

- [ ] 1.1 bot-tan-convo の作業用ブランチで、`POST /v1/sessions` に `context` を足し、使い方の `accept_context` が真のときだけ人物設定の後ろに足す（design.md D3）（完了の確認：convo の pytest で、`accept_context` の有無で文脈が足される・足されないこと、4,000字を超えると 400 になることが通る）
- [ ] 1.2 話しかけの指示文を使い方ごとに設定できるようにし（`idle_nudge`）、`space` と `space_bot` に Space 用の指示文と `proactive = { idle_s = 60, min_gap_s = 120 }` を設定する。`space_bot` だけ `accept_context = true`（完了の確認：convo の pytest で、使い方の指示文で話しかけること、60秒の沈黙で話しかけて2分は次をしないことが通る）

## 2. Nagi Space（BOT-08、design.md D1・D2・D4）

- [ ] 2.1 ホストの PDS から投稿を読み、直近7日・こっそり／CW／ラベル付きを除いて最大20件に整える処理を作る。本文はログに出さない（完了の確認：単体テストで、7日より古い・こっそり・CW・ラベル付きが除かれ、20件・200字に切られ、PDS が失敗・遅いと空になることが通る）
- [ ] 2.2 `GET /agent/context/[spaceId]` を作る（AGENT_SECRET で守る。botたんSpace だけ投稿を返し、パブリックSpace は空）（完了の確認：E2E で、秘密が無いと 401、パブリックSpace は空、botたんSpace は偽の PDS の投稿が整えて返ることが通る）

## 3. space-agent（BOT-08）

- [ ] 3.1 botたんの会話を作るときに `/agent/context` を読み、convo の会話の作成に `context` として渡す。読めなければ渡さずに作る（完了の確認：E2E で、botたんSpace では偽の convo が文脈を受け取り、パブリックSpace では受け取らないこと、`/agent/context` が失敗しても botたんが参加することが通る）

## 4. 結合確認

- [ ] 4.1 型チェック・単体テスト・E2E・space-agent の pytest・Prettier・OpenSpec の検証をすべて流す（完了の確認：すべて通る）
- [ ] 4.2 自宅の本物の convo で、botたんSpace でホストの最近の投稿に触れること、60秒の沈黙で話しかけることを手動で確かめる（完了の確認：利用者が確かめた日付と結果をこの項目に書く）

## Workflow follow-up

- convo の変更を main に取り込んで起動し直し、Nagi Space をデプロイし、space-agent を再起動する（手順は notes/release-runbook.md）。
- 実装完了後、主仕様（openspec/specs/）へ同期し、change をアーカイブする。
