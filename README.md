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

### 外部サービス

ローカルでは LiveKit サーバー（開発モード）と Redis を Docker で動かします。

```sh
cp .env.example .env.local
docker compose -f compose.dev.yml up -d
set -a; . ./.env.local; set +a; npm run test:integration   # 疎通確認
```

本番・Preview では、同じ環境変数に LiveKit Cloud（または自前の LiveKit）と Upstash Redis の値を設定します。接続先はこの4つの環境変数だけで切り替わります。

| 変数                                     | 内容                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------ |
| `LIVEKIT_URL`                            | LiveKit の URL（`wss://…` / `ws://…`）                                   |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit の API キーとシークレット                                        |
| `REDIS_URL`                              | Redis の URL（Upstash は `rediss://default:<パスワード>@<ホスト>:6379`） |

| コマンド                          | 内容                                                  |
| --------------------------------- | ----------------------------------------------------- |
| `npm run check`                   | 型チェック（svelte-check）                            |
| `npm run test:unit -- --run`      | ユニット・コンポーネントテスト（Vitest）              |
| `npm run test:e2e`                | E2Eテスト（Playwright。ビルドしたアプリに対して実行） |
| `npm test`                        | 上の2つをまとめて実行                                 |
| `npm run lint` / `npm run format` | Prettier の確認 / 整形                                |
| `npm run build`                   | Vercel 向けにビルド                                   |
