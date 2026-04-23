#!/usr/bin/env bash
set -euo pipefail

# Usage: scripts/release.sh [patch|minor|major|X.Y.Z[-prerelease]] [--dry-run]
# Default: patch
#
# Examples:
#   scripts/release.sh                # 0.3.2 -> 0.3.3 (patch)
#   scripts/release.sh minor          # 0.3.2 -> 0.4.0
#   scripts/release.sh 0.4.3          # 0.3.2 -> 0.4.3 (explicit)
#   scripts/release.sh 1.0.0-rc.1     # 0.3.2 -> 1.0.0-rc.1 (pre-release)

VERSION_ARG="${1:-patch}"
DRY_RUN=false

for arg in "$@"; do
  if [ "$arg" = "--dry-run" ]; then
    DRY_RUN=true
  fi
done

SEMVER_REGEX='^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?$'
if [[ ! "$VERSION_ARG" =~ ^(patch|minor|major)$ ]] && [[ ! "$VERSION_ARG" =~ $SEMVER_REGEX ]]; then
  echo "Usage: scripts/release.sh [patch|minor|major|X.Y.Z[-prerelease]] [--dry-run]"
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

# Compute new version (supports both SemVer keywords and explicit X.Y.Z)
CURRENT_VERSION="$(node -p "require('./package.json').version")"
if [[ "$VERSION_ARG" =~ ^(patch|minor|major)$ ]]; then
  NEW_VERSION="$(npx --yes semver "$CURRENT_VERSION" -i "$VERSION_ARG")"
  BUMP_LABEL=" ($VERSION_ARG)"
else
  NEW_VERSION="$VERSION_ARG"
  # Ensure the explicit version is strictly greater than current
  if [ -z "$(npx --yes semver "$NEW_VERSION" -r ">$CURRENT_VERSION" 2>/dev/null)" ]; then
    echo "Error: specified version $NEW_VERSION must be greater than current $CURRENT_VERSION"
    exit 1
  fi
  BUMP_LABEL=""
fi
echo ""
echo "==> $CURRENT_VERSION -> $NEW_VERSION$BUMP_LABEL"

if [ "$DRY_RUN" = true ]; then
  echo "[dry-run] Would commit and tag v$NEW_VERSION, then push to origin."
  exit 0
fi

read -r -p "Proceed? [y/N] " confirm
if [[ ! "$confirm" =~ ^[yY]$ ]]; then
  echo "Aborted."
  exit 1
fi

# npm version accepts both SemVer keywords and explicit X.Y.Z values
npm version "$NEW_VERSION" -m "chore: release v%s"

echo "==> Pushing commit and tag..."
git push origin main --follow-tags

echo ""
echo "Done! v$NEW_VERSION pushed. GitHub Actions will handle npm publish + GitHub Release."
