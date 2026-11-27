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

本番の手順は [notes/release-runbook.md](notes/release-runbook.md) にまとめています。本番・Preview では、同じ環境変数に LiveKit Cloud（または自前の LiveKit）と自宅の PostgREST（db.suibari.com）の値を設定します。接続先は環境変数だけで切り替わります。

| 変数                                     | 内容                                   |
| ---------------------------------------- | -------------------------------------- |
| `LIVEKIT_URL`                            | LiveKit の URL（`wss://…` / `ws://…`） |
| `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | LiveKit の API キーとシークレット      |

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

## space-agent（自宅側の botたんと字幕）

`agent/` は、自宅のマシンで動かす Python のプロセスです。Nagi Space と数秒ごとに同期し、開催中の Space に字幕用の参加者として入り、頼まれたら botたんとしても入ります（design.md D5）。bot-tan-convo（Nagi Space 向けの変更を入れたもの）と同じマシンで動かします。

```sh
cd agent
uv venv .venv && uv pip install -p .venv/bin/python -e '.[dev]'
SPACE_API_URL=https://<Nagi Space の origin> \
AGENT_SECRET=<Nagi Space と同じ値> \
CONVO_URL=http://127.0.0.1:8771 \
CONVO_LOGIN=<convo の allowed_logins にある名前> \
AGENT_HEALTH_PORT=8797 \
.venv/bin/python -m space_agent
```

| 変数                | 内容                                                                    |
| ------------------- | ----------------------------------------------------------------------- |
| `SPACE_API_URL`     | Nagi Space の URL                                                       |
| `AGENT_SECRET`      | Nagi Space の `AGENT_SECRET` と同じ値                                   |
| `CONVO_URL`         | bot-tan-convo の URL（同じマシンの `http://127.0.0.1:8771`）            |
| `CONVO_LOGIN`       | convo の `allowed_logins` にある名前。`Tailscale-User-Login` として送る |
| `SYNC_INTERVAL_S`   | 同期の間隔（秒）。既定 3                                                |
| `AGENT_HEALTH_PORT` | 死活確認（`GET /health`）の口。0 なら開かない                           |

テストは `cd agent && .venv/bin/python -m pytest`。E2E（`npm run test:e2e`）は、本物の space-agent を偽の convo（`tests/e2e/fixtures/fake_convo.py`）とつないで動かします。
