#!/usr/bin/env bash
# Publish both plugins with a user-supplied npm Granular Access Token.
# The token is read from ~/.npm-token (or NPM_TOKEN_FILE); it is never printed.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
token_file="${NPM_TOKEN_FILE:-$HOME/.npm-token}"

if [[ ! -s "$token_file" ]]; then
  echo "missing npm token file: $token_file" >&2
  echo "create a Granular Access Token with publish permission and write it there." >&2
  exit 1
fi

mode="$(stat -c '%a' "$token_file" 2>/dev/null || stat -f '%Lp' "$token_file")"
if [[ "$mode" != "600" ]]; then
  echo "warning: $token_file mode is $mode (recommended 600)" >&2
fi

tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
umask 077
printf '//registry.npmjs.org/:_authToken=%s\n' "$(tr -d '\r\n' < "$token_file")" > "$tmp"
export NPM_CONFIG_USERCONFIG="$tmp"
export npm_config_registry="https://registry.npmjs.org/"

trim_version="$(node -p "require('$root/packages/plugin-trim/package.json').version")"
recipe_version="$(node -p "require('$root/packages/plugin-recipe/package.json').version")"

echo "publishing dsh-plugin-trim@$trim_version"
(cd "$root/packages/plugin-trim" && pnpm publish --access public --no-git-checks)

echo "publishing dsh-plugin-recipe@$recipe_version"
(cd "$root/packages/plugin-recipe" && pnpm publish --access public --no-git-checks)

echo "verifying npm registry"
npm view "dsh-plugin-trim@$trim_version" version
npm view "dsh-plugin-recipe@$recipe_version" version
echo "done"
