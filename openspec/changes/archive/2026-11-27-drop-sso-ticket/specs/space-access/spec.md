# Spec Delta

## Purpose

Nagi からの移動を、DID ヒントだけでハンドル入力を省く形にそろえる。

機能一覧：

| 要件ID | 機能 | 変更 |
|---|---|---|
| ACC-01 | AT Protocol OAuth によるログイン | SSO チケットを外し、DID ヒントの受け方を定める |

## MODIFIED Requirements

### Requirement: ACC-01 AT Protocol OAuthによるログイン

Nagi Spaceは、利用者のPDSの認可サーバーとAT Protocol OAuthでログインさせなければならない（MUST）。OAuthクライアントは本アプリ独自のclient_idと正規originを持つ。すべての利用者は本アプリのOAuth認可を通ってログインする。Nagiから移動してきた場合は、Nagiのリンクに付く閲覧者のDIDヒント（`?did=`）で、ハンドルの入力を省いて認可へ進めなければならない（MUST）。DIDヒントは、ログイン画面・Spaceの共有URL・トップのどこに付いていても受け付け、未ログインならそのページを戻り先にして認可へ進む。戻り先とアドレスバーにはDIDヒントを残してはならない（MUST）。DIDヒントは認証に使わず、ログイン済みのときは無視する。SSOチケットは受け付けない。

#### Scenario: ハンドルを入力してログインする

- **WHEN** 未ログインの利用者がハンドルを入力してログインを選ぶ
- **THEN** 利用者のPDSで認可したあと、Nagi Spaceへ戻ってログイン状態になる

#### Scenario: NagiからSSOで移動する

- **WHEN** Nagiでログイン済みの利用者が、Nagi上のSpaceへのリンク（`/s/<id>?did=…`）を未ログインの状態で開く
- **THEN** ハンドルを入力せずに利用者のPDSの認可へ進み（認可済みなら確認だけで）、ログイン後に `did` の付かないリンク先のSpaceを表示する

#### Scenario: SSOチケットの取得に失敗する

- **WHEN** Nagi側でSSOチケットを取得できないか、Nagiがチケットを使わずにリンクを開く
- **THEN** DIDヒントだけでハンドルの入力を省いて認可へ進み、移動先のSpaceを失わない（Nagi SpaceはSSOチケットを使わない）

#### Scenario: ログイン済みでDIDヒント付きのリンクを開く

- **WHEN** Nagi Spaceにログイン済みの利用者が、DIDヒント付きのリンクを開く
- **THEN** 認可へは進まず、そのままページを表示する

#### Scenario: DIDヒントで認可を始められない

- **WHEN** DIDヒントの形が正しくないか、そのDIDで認可を始められない
- **THEN** ハンドルの入力画面を表示し、ログイン後の戻り先を失わず、同じヒントで繰り返し認可へ進まない
