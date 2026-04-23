# プロジェクト概要

## n8n-nodes-gh-project-promoter とは

`n8n-nodes-gh-project-promoter` は、GitHub Projects V2 のステータス管理を自動化する CLI ツール [ghpp](https://github.com/douhashi/ghpp)（GitHub Project Promoter）を n8n のカスタムノードとして操作可能にする npm パッケージである。

- **パッケージ名**: `n8n-nodes-gh-project-promoter`
- **対象バイナリ**: [douhashi/ghpp](https://github.com/douhashi/ghpp)
- **運用環境**: Docker（セルフホスト n8n）前提

## ghpp の役割

ghpp は GitHub Projects V2 において、定義済みの昇格ルールに基づいて Issue/PR のステータスを自動的に昇格（Promote）する。

### ステータスフロー

```
inbox → plan → ready → doing
```

ghpp が自動化する遷移:

| フェーズ     | 遷移              | 制約                                                                                       |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------ |
| 計画フェーズ | `inbox` → `plan`  | `--plan-limit` で指定された上限数まで（デフォルト: 3）                                     |
| 準備フェーズ | `plan` → `ready`  | オプトイン。`--planned-label` で指定したラベル（デフォルト: `planned`）が付いた Issue のみ |
| 実行フェーズ | `ready` → `doing` | 同一リポジトリで既に `doing` の Issue がある場合はスキップ                                 |

> `plan` → `ready` の遷移は ghpp v0.4.3 以降でサポート（デフォルト無効）。`--promote-ready-enabled` を有効化し、`--planned-label` で指定したラベルを対象 Issue に付与することで昇格対象となる。

## 本パッケージの目的

- ghpp の `promote` コマンドを n8n ワークフローから実行可能にする
- `npm install` 1回でバイナリ取得を含む実行環境を構築する
- GitHub Token を n8n の Credentials 機構で安全に管理する
