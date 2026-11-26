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

ローカルでは LiveKit サーバーと保存先（PostgreSQL + PostgREST）を Docker で動かします。LiveKit はホスト側のアプリ（`127.0.0.1:5173` と E2E の `127.0.0.1:4173`）へ Webhook を送るため、ホストのネットワークで動かします（Linux 向け。設定は `ops/dev/livekit.yaml`）。

```sh
cp .env.example .env.local
docker compose -f compose.dev.yml up -d
set -a; . ./.env.local; set +a; npm run test:integration   # 疎通確認
```

ローカルでは `http://127.0.0.1:5173` で開いてください（`localhost` は OAuth のループバックとして扱われません）。SvelteKit はビルド時にも環境変数を検証するので、`npm run build` の前にも環境変数を読み込んでください。

本番・Preview では、同じ環境変数に LiveKit Cloud（または自前の LiveKit）と自宅の PostgREST（db.suibari.com）の値を設定します。接続先は環境変数だけで切り替わります。

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

## 保存先（自宅DB）のセットアップ

保存先は PostgreSQL のスキーマ `nagi_space` で、PostgREST 経由で使います（design.md D1）。表は公開せず、`nagi_space.kv_*` 関数だけを `nagi_space_api` ロールに許可します。

1. `db/migrations/` の SQL を順に適用する
2. PostgREST の `db-schemas` に `nagi_space` を加える
3. PostgREST が使うロールに `nagi_space_api` を与える（anon ロールに与えるか、`role=nagi_space_api` の JWT を `POSTGREST_JWT` に設定する）
4. Cloudflare Access のサービストークンを `CF_ACCESS_CLIENT_ID_DB` / `CF_ACCESS_CLIENT_SECRET_DB` に設定する
