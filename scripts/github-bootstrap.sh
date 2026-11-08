#!/usr/bin/env bash
set -euo pipefail

# Bootstrap the GitHub repository after `gh auth login`.
# Usage:
#   REPO=owner/name VISIBILITY=public ./scripts/github-bootstrap.sh
#   REPO=owner/name VISIBILITY=private ./scripts/github-bootstrap.sh

REPO="${REPO:-StarlitSky/dsh-experience-optimizer}"
VISIBILITY="${VISIBILITY:-public}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is not installed. Install GitHub CLI, then run: gh auth login" >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "Not a git repository. Run: git init -b main && git add . && git commit -m 'chore: initial commit'" >&2
  exit 1
fi

if ! gh repo view "$REPO" >/dev/null 2>&1; then
  gh repo create "$REPO" "--${VISIBILITY}" --source=. --remote=origin --push
else
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "https://github.com/${REPO}.git"
  fi
  git push -u origin main
fi

# The v0.1.0 tag is intentionally left local: configure NPM_TOKEN before pushing it
# so the release workflow can publish. Then run: git push origin v0.1.0

gh repo edit "$REPO" \
  --add-topic dsh-plugin \
  --add-topic deepseek-harness \
  --add-topic dsh-plugin-suite \
  --add-topic plugin-compatibility \
  --add-topic workflow

echo "Repository: https://github.com/${REPO}"
echo "Next: set the social preview to assets/promo.png in GitHub repository settings."
echo "Next: configure NPM_TOKEN, then run: git push origin v0.1.0"
echo "Next: submit to dsh-plugin.org and dsh.so."
