# プロジェクト概要

## n8n-nodes-gh-project-promoter とは

`n8n-nodes-gh-project-promoter` は、GitHub Projects V2 のステータス管理を自動化する CLI ツール [ghpp](https://github.com/douhashi/ghpp)（GitHub Project Promoter）を n8n のカスタムノードとして操作可能にする npm パッケージである。

- **パッケージ名**: `n8n-nodes-gh-project-promoter`
- **対象バイナリ**: [douhashi/ghpp](https://github.com/douhashi/ghpp)
- **運用環境**: Docker（セルフホスト n8n）前提

## ghpp の役割

ghpp は GitHub Projects V2 において、定義済みの昇格ルールに基づいて Issue/PR のステータスを自動的に昇格（Promote）する。

### ステータスフロー

ghpp v0.6.1 以降は `--workflow=full|simple` で 2 モードを切替可能（デフォルト `full`）。

```
full   : inbox → plan → ready → doing
simple : inbox → doing
```

| モード           | 自動遷移                                                                                | stale demote 先   |
| ---------------- | --------------------------------------------------------------------------------------- | ----------------- |
| `full` (default) | `inbox` → `plan` → `ready` → `doing`                                                    | `doing` → `ready` |
| `simple`         | `inbox` → `doing`（plan/ready フェーズは skip。`--promote-*-enabled` は silently 無視） | `doing` → `inbox` |

#### full モードの自動遷移

| フェーズ     | 遷移              | 制約                                                                                                    |
| ------------ | ----------------- | ------------------------------------------------------------------------------------------------------- |
| 計画フェーズ | `inbox` → `plan`  | デフォルト有効。`--plan-limit` は Plan カラムの WIP 上限（デフォルト: 3）。既存の Plan 件数も含めて判定 |
| 準備フェーズ | `plan` → `ready`  | オプトイン。`--planned-label` で指定したラベル（デフォルト: `planned`）が付いた Issue のみ              |
| 実行フェーズ | `ready` → `doing` | 同一リポジトリで既に `doing` の Issue がある場合はスキップ                                              |

> `inbox` → `plan` の自動昇格は ghpp v0.6.0 以降で `--promote-plan-enabled` によりオプトアウト可能（デフォルト `true`）。手動で Plan に積む運用に切り替えたい場合は `--promote-plan-enabled=false` を指定する。
>
> `plan` → `ready` の遷移は ghpp v0.4.3 以降でサポート（デフォルト無効）。`--promote-ready-enabled` を有効化し、`--planned-label` で指定したラベルを対象 Issue に付与することで昇格対象となる。
>
> 「1 リポジトリ1件」ルール（doing フェーズ制約）は full / simple いずれのモードでも維持される。

## 本パッケージの目的

- ghpp の `promote` コマンドを n8n ワークフローから実行可能にする
- `npm install` 1回でバイナリ取得を含む実行環境を構築する
- GitHub Token を n8n の Credentials 機構で安全に管理する
