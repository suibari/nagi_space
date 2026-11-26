# Spec Delta

## Purpose

Nagi Spaceを使えるのをNagiに登録済みの利用者に限り、AT ProtocolのアカウントでログインしてSpaceの作成・入室・発話・リアクションを行えるようにする。

## ADDED Requirements

### Requirement: ACC-01 AT Protocol OAuthによるログイン

Nagi Spaceは、利用者のPDSの認可サーバーとAT Protocol OAuthでログインさせなければならない（MUST）。OAuthクライアントは本アプリ独自のclient_idと正規originを持つ。すべての利用者は本アプリのOAuth認可を通ってログインし、SSOチケットだけのセッションを作ってはならない（MUST）。Nagiから移動してきた場合は、Nagiの姉妹アプリ連携（短期SSOチケットとDIDヒント）で利用者を特定し、ハンドルの入力を省いて認可へ進めなければならない（MUST）。チケットが使えない場合は、DIDヒントだけで認可へ進む。

#### Scenario: ハンドルを入力してログインする

- **WHEN** 未ログインの利用者がハンドルを入力してログインを選ぶ
- **THEN** 利用者のPDSで認可したあと、Nagi Spaceへ戻ってログイン状態になる

#### Scenario: NagiからSSOで移動する

- **WHEN** Nagiでログイン済みの利用者が、Nagi上のSpaceへのリンクを開く
- **THEN** ハンドルを入力せずに利用者のPDSの認可へ進み（認可済みなら確認だけで）、ログイン後にリンク先のSpaceを表示する

#### Scenario: SSOチケットの取得に失敗する

- **WHEN** SSOチケットが期限切れか無効である
- **THEN** DIDヒント付きの通常のOAuthへ進み、移動先のSpaceを失わない

### Requirement: ACC-02 Nagi登録済みの利用者に限る

Nagi Spaceは、ログインしたアカウントがNagiに登録済みかをAppViewで確認し、未登録ならSpaceの作成・入室・発話・リアクションをさせてはならない（MUST）。未登録の利用者には、Nagiで登録する方法を案内する。「Nagi登録済み」とは、Nagiプロフィールを作成したか、Nagiに1回以上投稿したこと（AppViewの `getProfile` の `joinedAt` がある）を指す。この確認はサーバー側で行い、クライアントの表示だけで判断してはならない（MUST）。AppViewに問い合わせられないときは、未登録とみなさず、確認できなかったことを表示して再試行させる。

#### Scenario: Nagi未登録のアカウントでログインする

- **WHEN** Nagiに登録していないBlueskyアカウントでログインする
- **THEN** Spaceの一覧や入室の操作を出さず、Nagiで登録する案内を表示する

#### Scenario: AppViewに問い合わせられない

- **WHEN** ログイン中にAppViewへの登録確認が失敗する
- **THEN** 未登録の案内ではなく、確認できなかったことと再読み込みの操作を表示する

#### Scenario: クライアントを改変して入室を試みる

- **WHEN** Nagi未登録のアカウントが、Space管理APIへ直接入室を要求する
- **THEN** サーバーは入室用のトークンを発行せずに拒否する

### Requirement: ACC-03 ログインしていない閲覧者

ログインしていない閲覧者には、Spaceの共有リンクを開いたときにタイトル・ホスト・開催中かどうかだけを表示し、音声・字幕・参加者一覧・リアクションを見せてはならない（MUST）。ログインを促す操作を表示する。

#### Scenario: 未ログインで共有リンクを開く

- **WHEN** 未ログインの閲覧者がパブリックSpaceのURLを開く
- **THEN** Spaceのタイトルとホストとログインの案内を表示し、音声には接続しない

#### Scenario: 未ログインでbotたんSpaceのURLを開く

- **WHEN** 未ログインの閲覧者がbotたんSpaceのURLを開く
- **THEN** 存在しないSpaceと同じ表示を返し、タイトルやホストを見せない

### Requirement: ACC-04 セッションの復元とログアウト

再訪時は保存したOAuthセッションを復元しなければならない（MUST）。通信の一時的な失敗では、ログアウトしたように扱ってはならない。ログアウトしたときは、入室中のSpaceから退室してからセッションを終了しなければならない（MUST）。

#### Scenario: 再訪する

- **WHEN** 以前ログインした利用者が再びNagi Spaceを開く
- **THEN** ログインを求めずにログイン状態を復元する

#### Scenario: 入室中にログアウトする

- **WHEN** Spaceに入室中の利用者がログアウトする
- **THEN** Spaceから退室し、他の参加者の一覧からも消えたあとでログアウトする

### Requirement: ACC-05 年齢による制限をしない

Nagiの年齢申告にかかわらず、Nagiに登録済みの利用者は同じようにSpaceを作成・入室・発話・リアクションできなければならない（MUST）。Nagi Spaceは年齢による機能の制限を行わない。

#### Scenario: 18歳未満の利用者

- **WHEN** Nagiの年齢申告が18歳未満の利用者がパブリックSpaceを作成し、スピーカーとして話す
- **THEN** 18歳以上の利用者と同じように作成・発話できる
