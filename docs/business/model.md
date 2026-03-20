# ビジネスモデル

## ユースケース

### 定期実行によるプロジェクト管理の自動化

n8n の Cron トリガーと組み合わせ、定期的に `ghpp promote` を実行する。

```
[Cron Trigger] → [GHPP Node] → [通知 / ログ]
```

- Backlog の Issue を自動的に Plan に昇格（上限数制御あり）
- Ready の Issue を自動的に In progress に昇格（リポジトリ単位で1件まで）
- 昇格結果を Slack 等に通知可能

### 想定ユーザー

- GitHub Projects V2 でタスク管理を行うチーム / 個人
- n8n をセルフホストで運用しているユーザー

## 配布形態

- npm パッケージとして公開
- n8n の Community Nodes としてインストール可能
- ghpp バイナリは `postinstall` で自動取得（GitHub Releases の `latest`）

## ghpp の出力フォーマット

`ghpp promote` は Phase-grouped JSON を標準出力する:

```json
{
  "summary": { "promoted": 4, "skipped": 2, "total": 6 },
  "phases": {
    "plan": {
      "summary": { "promoted": 3, "skipped": 1, "total": 4 },
      "results": [
        {
          "item": { "id": "...", "title": "Issue title", "url": "https://...", "status": "Backlog" },
          "action": "promoted",
          "to_status": "Plan"
        }
      ]
    },
    "doing": {
      "summary": { "promoted": 1, "skipped": 1, "total": 2 },
      "results": [
        {
          "item": { "id": "...", "title": "...", "url": "https://...", "status": "Ready" },
          "action": "skipped",
          "reason": "repository already has doing issue"
        }
      ]
    }
  }
}
```

### JSON 出力の保証事項

- `phases.plan` と `phases.doing` は常にキーが存在する（0件でも省略されない）
- 各 `results` は0件の場合 `[]`（`null` ではない）
- `action` は `"promoted"` または `"skipped"`
- `"promoted"` の場合は `to_status` が付与される
- `"skipped"` の場合は `reason` が付与される
