#!/usr/bin/env bash
set -euo pipefail

usage() {
  echo "Usage: bash scripts/admin.sh add|remove <userId>" >&2
}

if [[ $# -ne 2 || ( "$1" != "add" && "$1" != "remove" ) ]]; then
  usage
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_DIR="${ROOT_DIR}/server"
DEV_TSX="${ROOT_DIR}/node_modules/.bin/tsx"

cd "${SERVER_DIR}"

if [[ -x "${DEV_TSX}" ]]; then
  exec "${DEV_TSX}" src/cli/admin.ts "$@"
fi

if [[ -f dist/cli/admin.js ]]; then
  exec node dist/cli/admin.js "$@"
fi

echo "Admin CLI is not available. Run pnpm install for dev or pnpm --filter server build for production." >&2
exit 1
