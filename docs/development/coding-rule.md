# コーディング規約

## 言語・ビルド

- TypeScript で実装し、`tsc` でビルドする
- ビルド成果物は `dist/` に出力される

## n8n ノード開発規約

### ファイル命名

- ノードファイル: `{NodeName}.node.ts`（パスカルケース）
- クレデンシャルファイル: `{CredentialName}.credentials.ts`（パスカルケース）

### ノード定義

- `INodeType` インターフェースを実装する
- `description` プロパティでノードのメタデータとパラメータを宣言的に定義する
- `execute` メソッドで実行ロジックを記述する

### 外部プロセス実行

- `child_process.execFile` を使用する（`exec` は使わない: シェルインジェクション防止）
- バイナリパスは `path.join(__dirname, '../../bin/ghpp')` で解決する
- Token は `--token` フラグで渡す

### エラー処理

- 外部プロセスの異常終了は `NodeOperationError` でラップする
- stderr をエラーメッセージに含める

### 出力形式

- `INodeExecutionData[]` 形式で返す
- JSON パース失敗時は `{ raw: stdout }` にフォールバックし、ノード自体はエラーにしない

## スクリプト規約

### postinstall (`scripts/download-binary.js`)

- 純粋な Node.js で記述する（外部依存なし）
- `node:https`, `node:fs`, `node:child_process` 等のビルトインモジュールのみ使用
- 非対応プラットフォームでは警告を出して exit 0（インストールを妨げない）
- 既存バイナリがある場合はスキップする
