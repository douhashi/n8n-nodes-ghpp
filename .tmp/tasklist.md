# n8n-nodes-ghpp 実装タスクリスト

## Phase 1: プロジェクト基盤

### 1.1 package.json 作成
- [ ] 要件定義に基づく `package.json` の作成
- [ ] `n8n` フィールド（nodes, credentials パス）の設定
- [ ] `scripts`（build, postinstall）の定義
- [ ] `devDependencies`（n8n-workflow, typescript）の設定

### 1.2 tsconfig.json 作成
- [ ] n8n カスタムノード向けの TypeScript 設定
- [ ] `outDir: "dist/"` の設定
- [ ] `nodes/`, `credentials/` を include 対象に設定

### 1.3 .gitignore 整備
- [ ] `bin/`（postinstall で生成されるバイナリ）
- [ ] `dist/`（ビルド成果物）
- [ ] `node_modules/`
- [ ] `.tmp/`

---

## Phase 2: バイナリ管理

### 2.1 postinstall スクリプト (`scripts/download-binary.js`)
- [ ] プラットフォーム判定（os, arch のマッピング）
- [ ] 非対応プラットフォームの場合は警告 + exit 0
- [ ] `bin/ghpp` 既存チェック（存在すればスキップ）
- [ ] `bin/` ディレクトリの自動作成
- [ ] GitHub Releases からの tar.gz ダウンロード（リダイレクト対応）
- [ ] tar.gz の展開と `bin/ghpp` への配置
- [ ] 実行権限の付与
- [ ] 外部依存なし（Node.js ビルトインモジュールのみ）

---

## Phase 3: Credentials

### 3.1 GhppApi Credentials (`credentials/GhppApi.credentials.ts`)
- [ ] `ICredentialType` の実装
- [ ] `token` フィールド（type: string, typeOptions: password）

---

## Phase 4: ノード実装

### 4.1 ノードアイコン (`nodes/Ghpp/ghpp.svg`)
- [x] SVG アイコンの作成

### 4.2 ノード本体 (`nodes/Ghpp/Ghpp.node.ts`)
- [ ] `INodeType` の実装
- [ ] description の定義
  - [ ] 基本情報（displayName, name, group, icon）
  - [ ] credentials 指定（GhppApi）
  - [ ] 必須パラメータ: Owner (string), Project Number (number)
  - [ ] 任意パラメータ: Plan Limit (number, default: 3)
  - [ ] collection 型: Status Settings（inbox, plan, ready, doing）
- [ ] execute メソッドの実装
  - [ ] Credentials からの token 取得
  - [ ] パラメータからのコマンド引数組み立て
  - [ ] `child_process.execFile` による `bin/ghpp promote` 実行
  - [ ] stdout の JSON パース → `INodeExecutionData[]` 返却
  - [ ] JSON パース失敗時の `{ raw: stdout }` フォールバック
  - [ ] 終了コード非0 時の `NodeOperationError`（stderr 含む）

---

## Phase 5: ビルド検証

### 5.1 依存関係インストール・ビルド
- [ ] `npm install` の実行
- [ ] postinstall による `bin/ghpp` の取得確認
- [ ] `npm run build` の実行
- [ ] `dist/` 以下に成果物が正しく生成されることを確認

---

## 依存関係

```
Phase 1 (1.1, 1.2, 1.3 は並行可能)
  ↓
Phase 2 (1.1 の完了後)
  ↓
Phase 3, 4.1 (Phase 1 の完了後、並行可能)
  ↓
Phase 4.2 (Phase 3 の完了後)
  ↓
Phase 5 (全 Phase の完了後)
```
