# Proposal

## Why

Nagi から Nagi Space へ移るときの連携に、短期SSOチケット（nagi-passport）と DID ヒントの2つを仕様に書いていた（ACC-01）。ところが Nagi Space は、ミュート一覧・通報・Nagi へのシェア・絵文字のお気に入りを本人の PDS 経由で呼ぶため、チケットがあっても必ず本アプリの OAuth 認可を通る（design.md D2）。チケットは「認可に渡す DID が本物か」を確かめるだけで、利用者の手間は DID ヒントだけのときと変わらない。

一方でチケットを使うには、Nagi AppView の `PASSPORT_AUDIENCES` への追加、nagi_client 側のアプリごとの受け口の切り替え、使用済みチケットの記録が要る。偽の DID ヒントで起きるのは「他人のハンドルで認可画面が開く」ことだけで、なりすましはできない。

姉妹アプリの連携を、次の規則でそろえる（nagi_client の AUTH-06 と同じ規則にする）。

> DID ヒントは許可した姉妹アプリすべてに付ける。チケットは、チケットだけでサインインが完結するアプリ（DID だけで足りるアプリ。今は botたんのお部屋）にだけ使う。

Nagi Space はチケットを使わない側になる。

## What Changes

- ACC-01 から SSO チケットを外し、Nagi からの移動は DID ヒントだけでハンドル入力を省いて認可へ進む、と書き直す。
- DID ヒントの受け方を仕様に書く：ログイン画面だけでなく、共有 URL（`/s/<id>`）とトップでも受け、ヒントが付いていて未ログインなら、そのページを戻り先にして認可へ進む。戻り先とアドレスバーには DID を残さない。
- チケットの受け口 `/sso`、チケットの検証、使用済みチケットの記録、環境変数 `NAGI_PASSPORT_ISSUER`、依存の `@suibari/nagi-passport` を削除する。
- 利用者から見える振る舞いは変わらない（Nagi はまだ Nagi Space へチケットを送っていない）。

## Capabilities

### New Capabilities

なし

### Modified Capabilities

- `space-access`：ACC-01（SSO チケットを外し、DID ヒントの受け方を定める）

## 非対象

- botたんのお部屋のチケットの扱い（お部屋は DID だけで足りるので、チケットを使い続ける）
- Nagi の画面からの移動以外のログインの流れ

## 影響

- **本リポジトリ**：`src/routes/sso/`、`src/lib/server/passport.ts`、`src/lib/server/runtime.ts`、`src/env.ts`、`.env.example`、`package.json`、E2E（`tests/e2e/sso.e2e.ts`、`tests/e2e/fixtures/`）、手順書。
- **nagi_client（外部リポジトリ）**：change `add-nagi-space-sibling` で、Nagi Space 宛のリンクには DID ヒントだけを付け、チケットを取りに行かないようにする（ブランチ `nagi-space-sso`）。
- **Nagi AppView（外部リポジトリ）**：`PASSPORT_AUDIENCES` に Nagi Space を加える作業が不要になる。

## 未決事項

なし（2026-11-27 利用者と決定）
