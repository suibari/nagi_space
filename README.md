# Nagi Space

全肯定SNS「Nagi」の利用者向けのリアルタイム音声チャットです。Nagiユーザーが集まって話し、聴き、絵文字で反応できます。全肯定botたんを会話に呼ぶこともできます。

仕様は OpenSpec で管理しています。作業の前に [AGENTS.md](AGENTS.md) と `openspec/` を読んでください。

## 開発

必要なもの：Node.js 22以上、npm 10以上

```sh
npm install
npx playwright install chromium   # 初回とPlaywright更新後
npm run dev
```

| コマンド                          | 内容                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `npm run check`                   | 型チェック（svelte-check）                            |
| `npm run test:unit -- --run`      | ユニット・コンポーネントテスト（Vitest）              |
| `npm run test:e2e`                | E2Eテスト（Playwright。ビルドしたアプリに対して実行） |
| `npm test`                        | 上の2つをまとめて実行                                 |
| `npm run lint` / `npm run format` | Prettier の確認 / 整形                                |
| `npm run build`                   | Vercel 向けにビルド                                   |
