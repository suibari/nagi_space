# 本番公開までの手順（残作業）

作業2.3・2.5・2.6 と、その前後に要る作業をまとめた。上から順に進めると、前の手順で作った値を後の手順で使える。各手順の「確認」が通ったら次へ進む。

値の控えは、リポジトリに入らない `.env.production.local`（`.gitignore` の `.env*.local` に当たる）に書きためると、最後の結合テストでそのまま使える。

## 0. 公開前に決めておくこと

- 最初は自分だけが Space を作れるようにするか。するなら `SPACE_CREATOR_ALLOWLIST` に自分の DID を入れる（入室は誰でもできる）。

## 1. 外部リポジトリの変更を本番に出す

### 1-1. bot-tan-convo（botたん・字幕に必須）

1. `../bot-tan-convo-nagi-space`（ブランチ `nagi-space`）の差分を確認し、main に取り込む。main には作業中の `ardy/serve.py` があるので、先に片付ける。
2. `config.toml` の `[profiles.space]` と `[profiles.space_bot]` の人物設定の文面を確認する。
3. 動いている convo（`../bot-tan-convo`、port 8771）を止め、取り込んだ main で起動し直す。
4. 確認：`tailscale` の内側から `curl http://127.0.0.1:8771/v1/health` を開き、`max_sessions`・`sessions`・`max_transcribe`・`transcribers` が返る。

### 1-2. bsky-affirmative-bot（通報に必須）

1. ブランチ `nagi-space-report` を main に取り込む。
2. lexicon を公開する（`lex:publish`）。
3. AppView をデプロイする。
4. 確認：本番公開後の手順 7 で、通報が Discord に届く。これが済むまで Nagi Space の通報は失敗する。

### 1-3. nagi_client（Nagi からの移動でハンドル入力を省く。任意）

ログインは AT Protocol OAuth だけで完結する。Nagi のリンクから移ったときにハンドル入力を省く場合だけ行う（ACC-01。DID ヒントだけを使い、SSO チケットは使わない。AppView の設定は不要）。

1. `../nagi_client-nagi-space-sso`（ブランチ `nagi-space-sso`）を nagi_client の main に取り込み（PR #254）、デプロイする。

## 2. ドメインと Vercel のプロジェクト

1. Vercel で、このリポジトリから新しいプロジェクトを作る（Framework は SvelteKit、ビルドは既定のまま）。
2. Vercel の Domains に `nagi-space.suibari.com` を加える。
3. Cloudflare の DNS に、Vercel が示す CNAME（`cname.vercel-dns.com` など）を加える。プロキシは「DNS only」にする（Vercel が証明書を発行するため）。
4. 確認：Vercel の Domains で `nagi-space.suibari.com` が Valid になる。
   この時点では環境変数が無いのでデプロイは失敗してよい（SvelteKit がビルド時に環境変数を確かめるため）。

## 3. 保存先（作業2.5）

### 3-1. 自宅の PostgreSQL

1. マイグレーションを順に適用する。

   ```sh
   psql "<自宅DBの接続文字列>" -f db/migrations/0001_nagi_space_kv.sql
   psql "<自宅DBの接続文字列>" -f db/migrations/0002_nagi_space_kv_incr.sql
   ```

2. PostgREST が接続に使うロール（ローカルでは `authenticator`）が `nagi_space_api` に切り替われるようにする。

   ```sql
   grant nagi_space_api to authenticator;
   ```

### 3-2. 自宅の PostgREST（db.suibari.com）

1. 設定の `db-schemas`（環境変数なら `PGRST_DB_SCHEMAS`）に `nagi_space` を加える（例：`public,nagi_space`）。
2. 読み直させる。設定ファイルなら `NOTIFY pgrst, 'reload config';` で足りるが、環境変数（`PGRST_*`）は起動時にしか読まれないので、docker compose ならコンテナを作り直す（`docker compose up -d --force-recreate <PostgREST のサービス>`。`restart` では反映されない）。
3. `role=nagi_space_api` の JWT を、PostgREST の `jwt-secret` で署名して作る。値は `POSTGREST_JWT` に控える。

   ```sh
   node -e "const c=require('crypto');const b=o=>Buffer.from(JSON.stringify(o)).toString('base64url');const h=b({alg:'HS256',typ:'JWT'}),p=b({role:'nagi_space_api'});console.log(h+'.'+p+'.'+c.createHmac('sha256',process.argv[1]).update(h+'.'+p).digest('base64url'))" '<PostgREST の jwt-secret>'
   ```

   （他のアプリと同じく anon ロールで動かしている場合は、`grant nagi_space_api to <anon ロール>` にして `POSTGREST_JWT` を空にしてもよい。ただし JWT を使うほうが、他のアプリから Nagi Space の表を触れなくなる。）

### 3-3. Cloudflare Access

1. Cloudflare Zero Trust → Access → Service Auth で、Nagi Space 用のサービストークンを作る。Client ID と Client Secret を `CF_ACCESS_CLIENT_ID_DB` / `CF_ACCESS_CLIENT_SECRET_DB` に控える（Secret は作成時にしか表示されない）。
2. db.suibari.com の Access アプリケーションに、このトークンを許可するポリシーを加える。Action は「Allow」ではなく「Service Auth」にする（Allow だとログイン画面に送られ、トークンでは通らない）。
3. 確認（手元から）：

   ```sh
   curl -s -X POST https://db.suibari.com/rpc/kv_get \
     -H "CF-Access-Client-Id: <ID>" -H "CF-Access-Client-Secret: <Secret>" \
     -H "Authorization: Bearer <POSTGREST_JWT>" \
     -H "Content-Profile: nagi_space" -H "Content-Type: application/json" \
     -d '{"p_key":"nope"}'
   ```

   `null` が返れば通っている。403 なら Access、401 や `permission denied` なら JWT とロール、404 なら `db-schemas` を見直す。

## 4. LiveKit Cloud（作業2.3）

1. LiveKit Cloud でプロジェクトを作る（無料枠：接続時間 月5,000分・同時接続100）。
2. Settings → Keys で API キーを作り、`LIVEKIT_URL`（`wss://<プロジェクト>.livekit.cloud`）・`LIVEKIT_API_KEY`・`LIVEKIT_API_SECRET` を控える。
3. Settings → Webhooks に `https://nagi-space.suibari.com/livekit/webhook` を加え、署名に上で作った API キーを選ぶ。入退室と room の終了はこの Webhook で反映するので、無いと人数や「ホストの再接続を待っています」が動かない。

## 5. botたんの3Dモデルの置き場（作業2.6）

モデルは公開せず、bot-tan-room・ChatVRM_bot-tan と同じ非公開の R2 バケット（`room-bot-tan`）に置く。ブラウザは Nagi Space の `/bot-assets/…` を読み、Nagi Space がログイン中の人にだけ署名付き URL へ転送する。

1. まとめる。

   ```sh
   node scripts/build-bot-assets.mjs ../bot-tan-convo /tmp/bot-assets
   ```

   出力：`bot-tan.vrm`、`motions/<カテゴリ>/*.vrma`、`manifest.json`。

2. バケットの直下に `manifest.json` と `motions/` をフォルダごとアップロードする。`bot-tan.vrm` は bot-tan-room と共用するので、アップロードせず直下の既存のものを使う（直下にほかのアプリの `manifest.json`・`motions/` が無いことを先に確かめる）。
3. R2 → Manage API Tokens で、このバケットだけを読める「Object Read only」のトークンを作り、Access Key ID と Secret Access Key を控える。
4. バケットの CORS ポリシーに Nagi Space の origin を**加える**。既存のアプリの origin は消さない。

   ```json
   [
   	{
   		"AllowedOrigins": [
   			"https://room-bot-tan.suibari.com",
   			"<ChatVRM_bot-tan の origin>",
   			"https://nagi-space.suibari.com"
   		],
   		"AllowedMethods": ["GET", "HEAD"],
   		"MaxAgeSeconds": 86400
   	}
   ]
   ```

5. 確認は手順 6 のあと、本番で botたんを呼んで3Dモデルが出ることで行う。

## 6. Vercel の環境変数とデプロイ

1. 秘密の値を作る。

   ```sh
   openssl rand -base64 48   # SESSION_SECRET
   openssl rand -base64 48   # AGENT_SECRET（別の値にする）
   # OAUTH_PRIVATE_KEY_JWK（ES256 の秘密鍵。1行のJSON）
   node -e "const {privateKey}=require('crypto').generateKeyPairSync('ec',{namedCurve:'P-256'});console.log(JSON.stringify(privateKey.export({format:'jwk'})))"
   ```

2. Vercel の Settings → Environment Variables に、Production として次を設定する。

   | 変数                                                     | 値                                    |
   | -------------------------------------------------------- | ------------------------------------- |
   | `PUBLIC_ORIGIN`                                          | `https://nagi-space.suibari.com`      |
   | `SESSION_SECRET`                                         | 手順 6-1                              |
   | `OAUTH_PRIVATE_KEY_JWK`                                  | 手順 6-1                              |
   | `AGENT_SECRET`                                           | 手順 6-1                              |
   | `LIVEKIT_URL` / `LIVEKIT_API_KEY` / `LIVEKIT_API_SECRET` | 手順 4                                |
   | `DB_URL`                                                 | `https://db.suibari.com`              |
   | `POSTGREST_JWT`                                          | 手順 3-2                              |
   | `CF_ACCESS_CLIENT_ID_DB` / `CF_ACCESS_CLIENT_SECRET_DB`  | 手順 3-3                              |
   | `R2_ACCOUNT_ID`                                          | Cloudflare のアカウントID             |
   | `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`              | 手順 5-3                              |
   | `R2_BUCKET`                                              | `room-bot-tan`                        |
   | `SPACE_CREATOR_ALLOWLIST`                                | 手順 0 で決めた場合だけ（自分の DID） |

   `NAGI_APPVIEW_URL`・上限の値（`SPACE_MAX_*` など）は既定のままでよい。

3. 再デプロイする（Deployments → Redeploy）。
4. 確認：
   - `https://nagi-space.suibari.com/oauth-client-metadata.json` と `/jwks.json` が JSON を返す（`jwks.json` に秘密の `d` が含まれていないこと）。
   - トップ画面が開き、Nagi のアカウントでログインできる。

## 7. 本番の値での結合テスト（作業2.3・2.5 の完了の確認）

手元で `.env.production.local` に手順 3〜6 の値を書き、実行する。テスト用のキーを本番の保存先に書いて消す。

```sh
(set -a; . ./.env.production.local; set +a; npm run test:integration)   # 括弧で囲み、本番の値を今の端末に残さない
```

## 8. space-agent を自宅で常駐させる

1. 準備（初回だけ）。

   ```sh
   cd agent && uv venv .venv && uv pip install -p .venv/bin/python -e .
   ```

2. `~/.config/nagi-space-agent.env` を作る（`chmod 600`）。

   ```sh
   SPACE_API_URL=https://nagi-space.suibari.com
   AGENT_SECRET=<手順 6-1 と同じ値>
   CONVO_URL=http://127.0.0.1:8771
   CONVO_LOGIN=<convo の allowed_logins にある名前>
   AGENT_HEALTH_PORT=8797
   ```

3. `~/.config/systemd/user/nagi-space-agent.service` を作る。

   ```ini
   [Unit]
   Description=Nagi Space agent (botたん・字幕)
   After=network-online.target

   [Service]
   WorkingDirectory=/home/suibari/work/nagi_space/agent
   EnvironmentFile=%h/.config/nagi-space-agent.env
   ExecStart=/home/suibari/work/nagi_space/agent/.venv/bin/python -u -m space_agent
   Restart=always
   RestartSec=5

   [Install]
   WantedBy=default.target
   ```

4. 起動する。

   ```sh
   systemctl --user daemon-reload
   systemctl --user enable --now nagi-space-agent
   loginctl enable-linger suibari   # ログインしていなくても動かし続ける
   ```

5. 確認：`curl -s http://127.0.0.1:8797/health` が返り、`journalctl --user -u nagi-space-agent -f` にエラーが出続けていない。Space の作成画面で botたんSpace を選んでも「お休み中」が出ない。

## 9. 本番での通し確認

アカウントを2つ（ホスト役・参加者役）用意し、別々のブラウザで行う。

1. ホスト：パブリックSpaceを「Nagi にシェアする」付きで開始し、Nagi に投稿が出る（作業3.7 の残り）。
2. 参加者：一覧から入室し、ホストの声が聞こえる。絵文字を送るとホストの画面に出る。
3. 参加者：発話をリクエストし、ホストが承認すると話せる。字幕に話者名付きで出る。
4. ホスト：botたんを呼ぶ。3Dモデルが出て、話しかけると返事をする。botたんに抜けてもらえる。
5. 参加者：通報を送り、Discord に届く（手順 1-2 が済んでいる場合）。
6. ホスト：終了する。参加者の画面に「終了しました」と出て、一覧から消える。
7. ホスト：botたんSpace を作り、一覧に出ないこと、参加者役が URL を開いても「見つからない」ことを確かめる。

済んだら、tasks.md の 2.3・2.5・2.6 に日付と結果を書き、Workflow follow-up のシェアの確認を消す。

## 10. 仕上げ

1. ブランチ `nagi-space-initial` を main に取り込む（Vercel の Production ブランチを main にしておく）。
2. ~~OpenSpec の主仕様へ同期し、change をアーカイブする~~ → 2026-11-27 済み（`openspec/changes/archive/2026-11-27-nagi-space-initial/`）。本番でのシェアの確認は、この手順書の手順9で行う。
3. 一般公開するときに `SPACE_CREATOR_ALLOWLIST` を空にして再デプロイする。
4. LiveKit Cloud の使用量を見て、無料枠を超えそうなら design.md「公開前の LiveKit の運用の判断材料」に沿って運用を決める。
