#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/release.sh [patch|minor|major] [--dry-run]
# Default: patch

VERSION_TYPE="${1:-patch}"
DRY_RUN=false

for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    DRY_RUN=true
  fi
done

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo "Usage: scripts/release.sh [patch|minor|major] [--dry-run]"
  exit 1
fi

# Ensure clean working tree
if [ -n "$(git status --porcelain)" ]; then
  echo "Error: working tree is not clean. Commit or stash changes first."
  exit 1
fi

# Ensure on main branch
CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: must be on main branch (currently on $CURRENT_BRANCH)"
  exit 1
fi

# Ensure up-to-date with remote
git fetch origin main --quiet
LOCAL="$(git rev-parse HEAD)"
REMOTE="$(git rev-parse origin/main)"
if [ "$LOCAL" != "$REMOTE" ]; then
  echo "Error: local main is not up-to-date with origin/main"
  exit 1
fi

echo "==> Running checks..."
npm run lint
npm run format
npm run typecheck
npm run test
npm run build

# Bump version (creates commit + tag)
CURRENT_VERSION="$(node -p "require('./package.json').version")"
NEW_VERSION="$(npx --yes semver "$CURRENT_VERSION" -i "$VERSION_TYPE")"
echo ""
echo "==> $CURRENT_VERSION -> $NEW_VERSION ($VERSION_TYPE)"

if [ "$DRY_RUN" = true ]; then
  echo "[dry-run] Would commit and tag v$NEW_VERSION, then push to origin."
  exit 0
fi

read -r -p "Proceed? [y/N] " confirm
if [[ ! "$confirm" =~ ^[yY]$ ]]; then
  echo "Aborted."
  exit 1
fi

npm version "$VERSION_TYPE" -m "chore: release v%s"

echo "==> Pushing commit and tag..."
git push origin main --follow-tags

echo ""
echo "Done! v$NEW_VERSION pushed. GitHub Actions will handle npm publish + GitHub Release."
