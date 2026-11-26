# Spec Delta

## Purpose

Nagi SpaceをNagiの姉妹アプリと分かる見た目にする。Nagiのデフォルトテーマ（bot-mint）の配色、ライト・ダークの切り替え、Nagiブランドに似せたfaviconとOGP、スマートフォンで使える画面配置を定める。

## ADDED Requirements

### Requirement: LOOK-01 Nagiのデフォルトテーマに合わせる

画面の配色・文字・角丸・アイコンの雰囲気は、Nagiのデフォルトテーマ（bot-mint）に合わせなければならない（MUST）。Nagiの他の配色テーマ（latte-pinkなど）には対応しない。

#### Scenario: Nagiから移動してくる

- **WHEN** 利用者がNagiからNagi Spaceへ移動する
- **THEN** Nagiのデフォルトテーマと同じ系統の配色で表示される

### Requirement: LOOK-02 ライト・ダークの切り替え

利用者は「端末の設定に合わせる」「ライト」「ダーク」から表示を選べなければならない（MUST）。既定は「端末の設定に合わせる」とする。選んだ設定はこの端末に保存し、再訪時は最初の描画から適用して、明るい画面の点滅を起こしてはならない（MUST）。保存した値を読めないときは既定に戻す。

#### Scenario: ダークを選んで再訪する

- **WHEN** ダークを選んだ利用者がNagi Spaceを再び開く
- **THEN** 最初の描画からダークで表示され、明るい画面が一瞬も出ない

#### Scenario: 端末の設定が変わる

- **WHEN** 「端末の設定に合わせる」を選んでいて、端末がダークモードに切り替わる
- **THEN** 再読み込みせずにダークの表示に切り替わる

### Requirement: LOOK-03 faviconとアプリアイコン

faviconとホーム画面用のアイコンは、Nagiのアイコンに似せつつNagi Spaceと区別できる独自のデザインにしなければならない（MUST）。ブラウザのテーマ色は、選んだライト・ダークに合わせる。

#### Scenario: Nagiと並べてタブを開く

- **WHEN** NagiとNagi Spaceを別のタブで開く
- **THEN** どちらもNagiの仲間と分かり、かつ区別できるアイコンが表示される

### Requirement: LOOK-04 OGP

Nagi SpaceのページはNagiブランドに似せたOGP画像を返さなければならない（MUST）。パブリックSpaceのURLでは、Spaceのタイトル・ホストの表示名・開催中かどうかを入れた画像とタイトルを返す。botたんSpaceと存在しないSpaceのURLでは、Space固有の情報を含まない共通のOGPを返す（MUST）。

#### Scenario: パブリックSpaceのURLをNagiに投稿する

- **WHEN** 開催中のパブリックSpaceのURLを含む投稿のリンクカードが作られる
- **THEN** タイトルとホスト名が入ったNagi Spaceの画像が表示される

#### Scenario: botたんSpaceのURLを共有する

- **WHEN** botたんSpaceのURLのOGPを取得する
- **THEN** タイトルやホストを含まない共通の画像とタイトルを返す

### Requirement: LOOK-05 スマートフォンでの画面配置

Space画面は、幅360pxのスマートフォンで横スクロールせずに、スピーカー、botたんの3Dモデル、字幕、絵文字の送信、マイク操作を使えなければならない（MUST）。

#### Scenario: スマートフォンで入室する

- **WHEN** 幅360pxの画面でbotたんが参加しているSpaceに入室する
- **THEN** 横スクロールせずに、3Dモデル・字幕・絵文字ボタンが見えて操作できる

### Requirement: LOOK-06 日本語と英語の表示

画面はNagiと同じく日本語と英語で表示できなければならない（MUST）。既定はブラウザの言語に合わせ（日本語以外は英語）、利用者が設定で切り替えた言語はこの端末に保存する。字幕とSpaceのタイトルは翻訳せず、話された・書かれた言語のまま表示する。

#### Scenario: 英語のブラウザで開く

- **WHEN** ブラウザの言語が英語の利用者が初めてNagi Spaceを開く
- **THEN** 画面が英語で表示される

#### Scenario: 字幕の言語

- **WHEN** 英語表示の利用者が、日本語で話されているSpaceに入室する
- **THEN** 画面の文言は英語のまま、字幕は日本語で表示される
