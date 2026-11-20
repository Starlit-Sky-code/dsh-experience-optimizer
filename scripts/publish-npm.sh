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
export npm_config_userconfig="$tmp"
export npm_config_registry="https://registry.npmjs.org/"

otp="${NPM_OTP:-}"
if [[ -z "$otp" && -s "$HOME/.npm-otp" ]]; then
  otp="$(tr -d '\r\n' < "$HOME/.npm-otp")"
fi
publish_args=(--access public --userconfig "$tmp")
if [[ -n "$otp" ]]; then
  publish_args+=(--otp "$otp")
fi

trim_version="$(node -p "require('$root/packages/plugin-trim/package.json').version")"
recipe_version="$(node -p "require('$root/packages/plugin-recipe/package.json').version")"

echo "publishing dsh-plugin-trim@$trim_version"
(cd "$root/packages/plugin-trim" && npm publish "${publish_args[@]}")

echo "publishing dsh-plugin-recipe@$recipe_version"
(cd "$root/packages/plugin-recipe" && npm publish "${publish_args[@]}")

echo "verifying npm registry (new packages can take a few minutes)"
for attempt in $(seq 1 18); do
  if npm view "dsh-plugin-trim@$trim_version" version >/dev/null 2>&1 &&
     npm view "dsh-plugin-recipe@$recipe_version" version >/dev/null 2>&1; then
    npm view "dsh-plugin-trim@$trim_version" version
    npm view "dsh-plugin-recipe@$recipe_version" version
    echo "done"
    exit 0
  fi
  echo "waiting for registry ($attempt/18)…"
  sleep 10
done
echo "published, but registry verification is still lagging; check npm view later." >&2
exit 1
