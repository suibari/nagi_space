# Spec Delta

## Purpose

botたんSpace は名前を入れずに始められるようにする。

## MODIFIED Requirements

### Requirement: LIFE-01 Spaceの作成

ログイン済みのNagiユーザーは、種別（パブリックSpace・botたんSpace）を指定してSpaceを作成し、すぐ開始できなければならない（MUST）。作成した利用者がホストになる。1人が同時に開催できるSpaceは1つまでとする（MUST）。パブリックSpaceはタイトルが必須で、空白だけのタイトルは受け付けない。botたんSpaceはタイトルを入れず、決まった名前（「botたんとおしゃべり」、英語の表示では「Chat with bot-tan」）で表示する（MUST）。

#### Scenario: パブリックSpaceを作成する

- **WHEN** 利用者がタイトルを入力し、種別にパブリックSpaceを選んで開始する
- **THEN** Spaceが開催中になり、利用者がホストのスピーカーとして入室する

#### Scenario: botたんSpaceを作成する

- **WHEN** 利用者が種別にbotたんSpaceを選ぶ
- **THEN** タイトルの入力欄は表示されず、そのまま開始でき、画面の見出しには「botたんとおしゃべり」と表示される

#### Scenario: 開催中にもう1つ作成しようとする

- **WHEN** すでにSpaceを開催中のホストが別のSpaceを作成しようとする
- **THEN** 作成せず、開催中のSpaceへ戻る操作を案内する
