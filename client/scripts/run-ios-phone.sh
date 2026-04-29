#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

find_meshnet_ip() {
  ifconfig | awk '
    $1 == "inet" {
      split($2, parts, ".")
      if (parts[1] == 100 && parts[2] >= 64 && parts[2] <= 127) {
        print $2
        exit
      }
    }
  '
}

find_default_ip() {
  local iface
  iface="$(route get default 2>/dev/null | awk '/interface:/{print $2; exit}')"
  if [ -n "$iface" ]; then
    ipconfig getifaddr "$iface" 2>/dev/null || true
  fi
}

host="${DEV_SERVER_HOST:-}"
if [ -z "$host" ]; then
  host="$(find_meshnet_ip)"
fi
if [ -z "$host" ]; then
  host="$(find_default_ip)"
fi
if [ -z "$host" ]; then
  host="$(ipconfig getifaddr en0 2>/dev/null || true)"
fi

if [ -z "$host" ]; then
  echo "Could not detect a reachable Mac IP for the iPhone."
  echo "Run with DEV_SERVER_HOST set, for example:"
  echo "  DEV_SERVER_HOST=100.x.y.z pnpm ios:phone"
  exit 1
fi

export DEV_SERVER_HOST="$host"
export DEV_SERVER_PORT="${DEV_SERVER_PORT:-3001}"
export IOS_ALLOW_HTTP="${IOS_ALLOW_HTTP:-1}"

echo "Building iOS phone app with API server:"
echo "  http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}/api"
echo
echo "Before opening the app, make sure the backend is running:"
echo "  pnpm backend"
echo
echo "From the iPhone, this should load JSON in Safari:"
echo "  http://${DEV_SERVER_HOST}:${DEV_SERVER_PORT}/api/health"
echo

case " $* " in
  *" --help "*|*" -h "*)
    exec pnpm exec expo run:ios --device --configuration Release "$@"
    ;;
esac

echo "Syncing iOS native config for this build..."
pnpm exec expo prebuild --platform ios

exec pnpm exec expo run:ios --device --configuration Release "$@"
