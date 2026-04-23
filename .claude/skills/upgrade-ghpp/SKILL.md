---
name: upgrade-ghpp
description: 'ghpp CLIの新リリースに追従し、差分を取り込んだうえで同一バージョンのnpmリリースを自動実行する。upgrade-ghpp, ghpp追従, ghpp更新, ghppリリース, バージョン同期'
user-invocable: true
allowed-tools: Read, Edit, Write, Grep, Glob, Bash
---

# ghpp 追従リリース

このリポジトリの最新タグと ghpp の最新リリースを比較し、**その間のすべての ghpp リリース** に含まれる変更を取り込んだうえで、ghpp と同一バージョンの npm リリースを実行する。

## 基本ルール（不変）

- **バージョンは ghpp と厳密一致**: npm パッケージのリリース番号は ghpp の最新タグと完全一致させる。
- **1 リリース = 1 コミット**: `ghpp.version` 更新・ノード変更・テスト追加・ドキュメント整備は **単一のコミット** に集約する。bump だけを先行コミットすることは **禁止**。
- **引数不要**: 現行タグと ghpp 最新を自動検出する。手動でバージョンを指定しない。
- **推測実装の禁止**: ghpp のリリースノート / PR に明示されていない CLI フラグを勝手に追加しない。

## Phase 1: 現状と差分の検出

1. 現行タグを取得:

   ```bash
   git fetch --tags --quiet
   git describe --tags --abbrev=0
   ```

   例: `v0.4.3`。これが最後にリリースした npm バージョン兼最後に追従した ghpp バージョン（厳密一致ルールによる）。

2. ghpp 最新リリースを取得:

   ```bash
   gh release view --latest -R douhashi/ghpp --json tagName --jq .tagName
   ```

   例: `v0.4.5`。

3. 同一なら **"already in sync"** と報告して終了。

4. 差分対象のリリース群を列挙:

   ```bash
   gh release list -R douhashi/ghpp --limit 50 --json tagName,publishedAt
   ```

   現行タグより新しいものを時系列順に並べる（0.4.4, 0.4.5 の複数世代に跨ることもある）。

5. 各リリースの内容と紐づく PR を取得し、以下 3 点を抽出:

   ```bash
   gh release view vX.Y.Z -R douhashi/ghpp --json body,tagName
   gh pr view <N>       -R douhashi/ghpp --json title,body
   ```

   - 新 CLI フラグ / 環境変数の追加
   - 既存フラグの非互換変更（名前変更・デフォルト変更・削除）
   - 出力 JSON 構造の変更（`phases.*` キー追加など）

6. 非互換変更がある場合は **必ずユーザーに報告して判断を仰ぐ**。ノードの API に破壊的変更が波及する可能性があるため、独断で進めない。

## Phase 2: `package.json` の `ghpp.version` 更新

```json
"ghpp": { "version": "X.Y.Z" }
```

ghpp 最新バージョン（`v` 接頭辞を外した形）に更新する。**この時点ではまだコミットしない**。Phase 3-5 と合わせて 1 コミットにする。

## Phase 3: ノード実装（新フラグがある場合）

`nodes/Ghpp/Ghpp.node.ts` に UI パラメータを追加。

- **promote 専用**: `displayOptions.show.operation = ['promote']`
- **demote 専用**: `displayOptions.show.operation = ['demote']`
- **依存フラグ**（親 bool が true のときのみ有効な子フラグ）: `displayOptions.show` に親キーも追加
- **bool**: `true` のときだけ `args.push('--flag')`（`dryRun` パターン）
- **文字列・数値**: ghpp 側デフォルトと同値なら `args.push` しない（最小引数原則）

`nodes/Ghpp/Ghpp.node.test.ts` に最低限以下を追加:

- デフォルト値時に CLI 引数に含まれない
- 非デフォルト値時に CLI 引数に含まれる
- 依存関係があれば親フラグとの組み合わせパターン
- `demote` 時に promote 専用フラグが含まれないこと（該当する場合）

`createMockExecuteFunctions` の `params` にも新キーを追加。`getNodeParameter` モックが fallback 引数を解決していなければ対応させる: `(name, i, fallback) => params[name] ?? fallback`。

## Phase 4: ドキュメント更新

新 CLI フラグまたは JSON 構造変更があれば、以下を **すべて** 整合的に更新:

| ファイル                        | 更新箇所                                                                   |
| ------------------------------- | -------------------------------------------------------------------------- |
| `README.md`                     | Phase テーブル / Optional パラメータ表 / Output JSON サンプル / Guarantees |
| `docs/business/overview.md`     | ステータスフロー表と注記                                                   |
| `docs/business/model.md`        | ユースケース箇条書き / JSON 出力サンプル / 保証事項                        |
| `docs/development/guideline.md` | 任意パラメータ表                                                           |

Output JSON に新しい `phases.*` キーが増えた場合は README と model.md の両方に反映する。

## Phase 5: 検証

```bash
npm run typecheck && npm run lint && npm run format && npm test
```

全 pass が必須。失敗時は修正して再実行（pre-commit hook（lefthook）も同じチェックを走らせる）。

## Phase 6: 単一コミット & push

- `git add <個別ファイル>` で明示ステージ（`-A` / `.` は禁止）
- コミットメッセージ:
  - 新機能 UI 公開あり: `feat: support ghpp vX.Y.Z <主要機能を1語で>`
  - バージョン bump のみ（ghpp が bugfix のみだった場合）: `chore: bump ghpp CLI version to X.Y.Z`
- Co-Authored-By フッタを付与
- `git push origin main`

取り込んだ ghpp リリースが複数世代にまたがる場合、本文に対象バージョンをすべて列挙する（例: "Covers ghpp v0.4.4 and v0.4.5"）。

## Phase 7: リリース実行

ghpp と同一バージョンで release.sh を実行:

```bash
bash scripts/release.sh X.Y.Z --yes
```

release.sh が自動で行うこと（Phase 6 のコミットとは別に **release commit** が 1 つ積まれる。これは規定の動作であり、単一コミットルールの例外）:

1. lint / format / typecheck / test / build
2. `package.json` の npm `version` フィールドを X.Y.Z に bump
3. `chore: release vX.Y.Z` コミット + `vX.Y.Z` タグ作成
4. `git push origin main --follow-tags`

タグ push が GitHub Actions の Release ワークフローを起動し、npm publish + GitHub Release を実行。

## Phase 8: 報告

ユーザーに以下を提示:

- 取り込んだ ghpp リリース一覧（例: `v0.4.3 → v0.4.5（途中に v0.4.4 含む）`）
- 主要変更点のサマリ
- 新 npm バージョン
- Actions 進行確認 URL: https://github.com/douhashi/n8n-nodes-gh-project-promoter/actions

## 禁則

- **bump のみ / UI 変更のみの分割コミットは禁止**（Phase 6 の単一コミットに集約）
- **npm バージョンを ghpp とずらさない**（パッチレベルでもずらさない）
- `git push --force`, `git reset --hard`, `--no-verify`（lefthook バイパス）禁止
- `npm publish` をローカルで直接叩かない（Release ワークフロー経由のみ）
- リリースノート / PR に記載のない CLI フラグを推測実装しない
- 破壊的変更を独断で通さない（Phase 1-6 で検知した非互換変更はユーザー承認を必須とする）
