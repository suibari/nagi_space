# リポジトリでの作業方針

Nagi Space は、全肯定SNS「Nagi」の利用者向けリアルタイム音声チャットです。

## 仕様を読む

- 仕様の正本は OpenSpec。進行中の change は `openspec/changes/<name>/`（proposal・design・specs・tasks）、確定した仕様は `openspec/specs/<capability>/spec.md` にある。
- 作業の前に、関係する spec.md と design.md を読む。
- Nagi Webクライアント（`../nagi_client`）、Nagi AppView、bot-tan-convo（`../bot-tan-convo`）は別リポジトリ。外部の実装は、このリポジトリから確認できた範囲と区別して書く。

## 仕様と実装の関係

- 仕様が振る舞いの正本。コードは仕様に合わせる。
- 利用者から見える振る舞いを変えるときは、コードより先に OpenSpec の change を作って合意を得る。
- 仕様に無い挙動のうち、利用者の体験・公開範囲・保存するデータ・外部サービスへの書き込み・失敗時の扱いに関わるものは、自分で決めずに利用者に確認する。
- パブリックSpaceを閉じた会話にする機能や、利用者どうしの個別メッセージは作らない（PART-05・PART-10。電気通信事業法の届出を不要に保つための前提。proposal.md「法規との関係」）。

## OpenSpec の実行

nagi_client と同じ版を `npx` で使う。

```sh
npx --yes @fission-ai/openspec@1.17.0 list
npx --yes @fission-ai/openspec@1.17.0 validate --all --strict --no-interactive
```

## コードコメント

コメントに仕様を書き写さない。必要なら要件ID（例：`PART-05`）で参照する。コメントに書くのは、その場所でしか意味を持たない非自明な理由だけにする。
