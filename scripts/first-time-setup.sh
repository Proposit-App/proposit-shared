#!/usr/bin/env bash
#
# First-time setup for proposit-shared. Idempotent — safe to re-run.
#
# This repo is thin: no env file, no services, no database, no git hooks. The
# only post-install step is a built `dist/` (fixtures codegen + tsc), so that is
# the whole body. Nothing here is macOS- or Linux-specific.

set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

step() { printf '\n\033[1;34m==>\033[0m %s\n' "$1"; }
fail() {
    printf '\033[1;31merror:\033[0m %s\n' "$1" >&2
    exit 1
}

step "Checking prerequisites"
command -v node >/dev/null ||
    fail "Node is not installed. Install Node >= 22.3.0 (nvm, fnm, or https://nodejs.org)."
command -v pnpm >/dev/null ||
    fail "pnpm is not installed. Run: corepack enable && corepack prepare pnpm@latest --activate"

# First version-looking token of `engines.node`, so a compound range
# (">=22.3.0 <24") still yields a single comparable version.
required="$(node -p 'require("./package.json").engines.node.match(/\d[\d.]*/)[0]')"
current="$(node -p 'process.versions.node')"
[ "$(printf '%s\n%s\n' "$required" "$current" | sort -V | head -1)" = "$required" ] ||
    fail "Node $current is too old — this repo needs >= $required."
printf '  node %s, pnpm %s\n' "$current" "$(pnpm --version)"

if [ ! -d node_modules ]; then
    step "Installing dependencies (scripts/initial-setup.sh normally does this)"
    pnpm install
fi

step "Generating fixtures and building dist/"
pnpm run build

step "proposit-shared is ready"
cat <<'EOF'
Nothing left to do by hand: no env file, no services, no local credentials.
Run `pnpm run check` for the full gate (typecheck, lint, test, build).

One thing to know when iterating across the repo boundary — a consumer that
resolves this package from disk (`file:../proposit-shared`) reads `dist/`, not
`src/`, so keep

    pnpm exec tsc -p tsconfig.build.json -w

running while you work. Consumers that pin the published `@proposit/shared`
version from npm (server and mobile do today) need nothing.
EOF
