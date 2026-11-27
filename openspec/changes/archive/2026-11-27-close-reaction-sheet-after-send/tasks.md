# Tasks

## 1. シートを閉じる

- [x] 1.1 絵文字・コメントの送信が成功したらリアクションのシートを閉じ、操作バーの「リアクション」にフォーカスを戻す。失敗したら開いたまま理由を出し、コメントの文面を残す（REACT-01・COMM-01）（完了の確認：E2E で、絵文字とコメントを送るとシートが閉じてフォーカスが「リアクション」に戻ること、連投の制限ではシートが開いたままで文面が残ることが通る）

## 2. 結合確認

- [x] 2.1 型チェック・単体テスト・E2E・Prettier・OpenSpec の検証をすべて流す（完了の確認：`npm run check`、`npm run test:unit -- --run`、`npm run test:e2e`、`npm run lint`、`openspec validate --all --strict` が通る）
  - 2026-11-27 すべて通った（型チェック 0件、単体テスト 90件、E2E 91件、Prettier、OpenSpec 11件）。

## Workflow follow-up

- 実装完了後、主仕様（openspec/specs/）へ同期し、change をアーカイブする。
