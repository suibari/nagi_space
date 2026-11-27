# Spec Delta

## Purpose

botたんSpace では botたんを外す操作を出さず、障害のときだけ呼び直せるようにする。

## MODIFIED Requirements

### Requirement: BOT-01 botたんの招待と除外

ホストは開催中のパブリックSpaceにいつでもbotたんを招待し、いつでも除外できなければならない（MUST）。botたんSpaceでは、botたんは開始時に参加し（LIFE-02）、除外の操作を出さず、サーバーも除外を受け付けてはならない（MUST）。招待と除外はホストだけができ、スピーカーと聴衆にはこの操作を出さず、サーバーも受け付けてはならない（MUST）。botたんは人間のロール（ホスト・スピーカー・聴衆）に数えず、参加者一覧ではbotたんであることが分かるように表示する。

#### Scenario: ホストがbotたんを招待する

- **WHEN** パブリックSpaceのホストがbotたんを招待し、convoに空きがある
- **THEN** 数秒以内にbotたんがSpaceに加わり、参加者一覧と3Dモデルが表示される

#### Scenario: ホストがbotたんを除外する

- **WHEN** パブリックSpaceのホストがbotたんを除外する
- **THEN** botたんの発話が止まり、Spaceから退出し、convoのセッションを解放する

#### Scenario: botたんSpaceで除外しようとする

- **WHEN** botたんSpaceのホストの画面、またはサーバーへの直接の要求でbotたんの除外を試みる
- **THEN** 除外の操作は表示されず、サーバーも要求を拒否し、botたんは参加したままである

#### Scenario: スピーカーが招待を試みる

- **WHEN** スピーカーのクライアントが、Space管理APIへbotたんの招待を直接要求する
- **THEN** サーバーは要求を拒否し、botたんは参加しない

### Requirement: BOT-06 convoの障害

convoに接続できないか、会話中に接続が切れたときは、botたんを退出扱いにしてホストに知らせなければならない（MUST）。パブリックSpaceでは、人間どうしの音声と字幕は止めてはならない（MUST）。botたんSpaceでは、botたんが退出している間は字幕も止まり、ホストに「もう一度呼ぶ」操作を示す（MUST）。convoやbotたんの中継に届かない間は、招待の操作を「botたんは今お休み中」と表示して使えなくし、botたんSpaceも作らない（MUST）。空きが無いとき（BOT-02）の「いっぱい」とは表示を分ける。届くようになったら、招待の操作を再び使えるようにする。

#### Scenario: 会話中にconvoが止まる

- **WHEN** パブリックSpaceでbotたんの参加中にconvoへの接続が切れる
- **THEN** botたんが退出したと表示し、ホストに再招待の操作を示し、人間の会話と字幕は続く

#### Scenario: botたんSpaceでconvoが止まる

- **WHEN** botたんSpaceでbotたんの参加中にconvoへの接続が切れる
- **THEN** botたんが退出したと表示し、字幕は止まり、ホストに「もう一度呼ぶ」操作を示す。呼び直すとbotたんと字幕が戻る

#### Scenario: convoに届かない間に招待しようとする

- **WHEN** convoかbotたんの中継が止まっている間に、ホストがbotたんの招待の操作を見る
- **THEN** 招待の操作は使えず、「いっぱい」ではなく「botたんは今お休み中」と表示される

#### Scenario: convoに届かない間にbotたんSpaceを作成する

- **WHEN** convoかbotたんの中継が止まっている間に、botたんSpaceを作成しようとする
- **THEN** Spaceを作成せず、「botたんは今お休み中」と表示する
