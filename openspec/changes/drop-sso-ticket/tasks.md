# Tasks

## 1. DID ヒント（design.md D2）

- [x] 1.1 共有 URL とトップで、未ログインのときの DID ヒントを `/login` へ引き継ぐ（完了の確認：E2E で、`/s/<id>?did=` と `/?did=` が `did` を落とした戻り先付きの `/login` へ進み、ログイン済みなら Space をそのまま表示する）
  - 2026-11-27 ACC-01 を満たすための修正として先に入れた（8e0e91f）。

## 2. SSO チケットの削除（design.md D1）

- [x] 2.1 `/sso`、`src/lib/server/passport.ts`、ランタイムの検証器、`NAGI_PASSPORT_ISSUER`、`@suibari/nagi-passport`、E2E のチケットの試験と鍵を削除する（完了の確認：`npm run check`・単体テスト・E2E が通り、`src/` と `tests/` に `passport`・`/sso` が残っていない）
- [x] 2.2 README・`.env.example`・`notes/release-runbook.md` から、チケットと AppView の `PASSPORT_AUDIENCES` の手順を消す（完了の確認：`grep -rn -i "passport\|/sso"` が OpenSpec の記録以外に当たらない）

## 3. nagi_client（外部リポジトリ。ブランチ `nagi-space-sso`）

- [x] 3.1 change `add-nagi-space-sibling` を、DID ヒントは姉妹アプリすべて・チケットはお部屋だけ、の規則に直す（完了の確認：nagi_client で `openspec validate --all --strict` が通る）
  - 2026-11-27 nagi_client のブランチ `nagi-space-sso` に入れた（aa806c8。未push）。実装と `src/lib/sso/links.test.ts` も含む。
