# 開発ガイドライン

## 環境

- **Node.js**: mise で管理（node@24）
- **言語**: TypeScript（`tsc` でビルド）
- **ランタイム**: n8n（セルフホスト Docker）

## ディレクトリ構成

```
n8n-nodes-gh-project-promoter/
├── nodes/
│   └── Ghpp/
│       ├── Ghpp.node.ts          # ノード本体
│       └── ghpp.svg              # アイコン
├── credentials/
│   └── GhppApi.credentials.ts   # Credentials 定義
├── scripts/
│   └── download-binary.js        # postinstall スクリプト
├── bin/                          # postinstall で生成（gitignore 対象）
│   └── ghpp
├── package.json
└── tsconfig.json
```

## バイナリ管理

### 取得方法

`npm install` 時に `postinstall` スクリプトで GitHub Releases から自動ダウンロード。

- バージョン: **latest** を常に取得（バージョン固定しない）
- ダウンロード URL パターン:
  ```
  https://github.com/douhashi/ghpp/releases/latest/download/ghpp_{os}_{arch}.tar.gz
  ```

### 対応プラットフォーム

| OS     | アーキテクチャ |
| ------ | -------------- |
| linux  | amd64          |
| linux  | arm64          |
| darwin | arm64          |

- 非対応プラットフォームの場合は警告を出して正常終了（exit 0）
- `bin/ghpp` が既に存在する場合はダウンロードをスキップ

## Credentials

### GhppApi

| フィールド | 型                 | 説明                                                    |
| ---------- | ------------------ | ------------------------------------------------------- |
| `token`    | string（password） | GitHub Personal Access Token（repo + project スコープ） |

## ノード仕様

### 基本情報

| 項目     | 値                             |
| -------- | ------------------------------ |
| 表示名   | GHPP                           |
| name     | ghpp                           |
| グループ | transform                      |
| コマンド | `ghpp promote` / `ghpp demote` |

### Operation

| 値        | 説明                                                |
| --------- | --------------------------------------------------- |
| `promote` | Issue アイテムを次のステータスに昇格させる          |
| `demote`  | 停滞した Issue アイテムを前のステータスに降格させる |

### 必須パラメータ

| 表示名         | name            | 型     | 対応オプション     |
| -------------- | --------------- | ------ | ------------------ |
| Owner          | `owner`         | string | `--owner`          |
| Project Number | `projectNumber` | number | `--project-number` |

### 任意パラメータ

| 表示名          | name             | 型      | デフォルト | 対応オプション      | 表示条件         |
| --------------- | ---------------- | ------- | ---------- | ------------------- | ---------------- |
| Plan Limit      | `planLimit`      | number  | `3`        | `--plan-limit`      | promote 時のみ   |
| Stale Threshold | `staleThreshold` | string  | `2h`       | `--stale-threshold` | demote 時のみ    |
| Dry Run         | `dryRun`         | boolean | `false`    | `--dry-run`         | 共通（常に表示） |

### ステータス設定（collection 型: Status Settings）

| 表示名       | name          | 型     | デフォルト    | 対応オプション   |
| ------------ | ------------- | ------ | ------------- | ---------------- |
| Status Inbox | `statusInbox` | string | `Backlog`     | `--status-inbox` |
| Status Plan  | `statusPlan`  | string | `Plan`        | `--status-plan`  |
| Status Ready | `statusReady` | string | `Ready`       | `--status-ready` |
| Status Doing | `statusDoing` | string | `In progress` | `--status-doing` |

### 出力

- `ghpp promote` / `ghpp demote` の stdout を JSON パースして後続ノードの `json` フィールドに渡す
- JSON パース失敗時は `{ raw: "..." }` にフォールバック

### エラーハンドリング

- 終了コードが 0 以外の場合は `NodeOperationError` を投げる
- stderr の内容をエラーメッセージに含める

## セキュリティ考慮

- GitHub Token は Credentials に分離し、ノード設定から直接入力させない
- Token の渡し方: `--token` フラグ経由
