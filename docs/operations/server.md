# デプロイ・サーバー運用

## 運用環境

- Docker ベースのセルフホスト n8n
- n8n の Community Nodes 機構でインストール

## Docker での ghpp バイナリ取得

n8n の Docker イメージをカスタムビルドする場合、以下で ghpp を直接取得できる:

```dockerfile
RUN ARCH=$(uname -m | sed 's/x86_64/amd64/; s/aarch64/arm64/') && \
    wget -qO- "https://github.com/douhashi/ghpp/releases/latest/download/ghpp_linux_${ARCH}.tar.gz" \
    | tar xz -C /usr/local/bin ghpp
```

## npm 経由のインストール

Community Nodes として追加する場合:

1. n8n の「Settings > Community Nodes」から `n8n-nodes-ghpp` をインストール
2. `postinstall` スクリプトが自動的に ghpp バイナリをダウンロード
3. n8n を再起動

## バイナリのバージョン管理

- ghpp バイナリは常に `latest` リリースを取得する
- バージョンの固定は行わない
- バイナリ更新が必要な場合は `bin/ghpp` を削除して `npm install` を再実行する

## リリース手順

GitHub Actions による自動リリースが構築されている。

### 手順

1. `npm version patch`（または `minor` / `major`）でバージョンを更新
2. `git push origin main --tags` でタグを push
3. GitHub Actions が自動的に以下を実行:
   - CI チェック（lint / format / typecheck / test / build）
   - バージョン整合性チェック
   - npm publish
   - GitHub Release 作成
