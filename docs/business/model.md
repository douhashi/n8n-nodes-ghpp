# ビジネスモデル

## ユースケース

### 定期実行によるプロジェクト管理の自動化

n8n の Cron トリガーと組み合わせ、定期的に `ghpp promote` を実行する。

```
[Cron Trigger] → [GHPP Node] → [通知 / ログ]
```

- Backlog の Issue を Plan カラムの WIP 上限に達するまで自動昇格（既存の Plan 件数も含めて判定）
- Plan の Issue のうち指定ラベル付きのものを Ready に昇格（オプトイン）
- Ready の Issue を自動的に In progress に昇格（リポジトリ単位で1件まで）
- 停滞した Doing Issue を `demote` で Ready に降格（Status 遷移時刻を基準に判定）
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
					"item": {
						"id": "...",
						"title": "Issue title",
						"url": "https://...",
						"status": "Backlog"
					},
					"action": "promoted",
					"to_status": "Plan"
				}
			]
		},
		"ready": {
			"summary": { "promoted": 0, "skipped": 0, "total": 0 },
			"results": []
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

- `phases.plan` / `phases.ready` / `phases.doing` は常にキーが存在する（0件でも省略されない）
- `phases.ready` は `--promote-ready-enabled` が無効の場合は常に空
- 各 `results` は0件の場合 `[]`（`null` ではない）
- `action` は `"promoted"` または `"skipped"`
- `"promoted"` の場合は `to_status` が付与される
- `"skipped"` の場合は `reason` が付与される
