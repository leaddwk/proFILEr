#!/bin/bash
# Compatible with the Bash 3.2 included in macOS.
set -euo pipefail
project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd -- "$project_root"
setup_only=0
no_browser=0
for option in "$@"; do
  case "$option" in
    --setup-only) setup_only=1 ;;
    --no-browser) no_browser=1 ;;
    *) printf 'Unknown option: %s\n' "$option" >&2; exit 1 ;;
  esac
done
server_pid=''
staging=''
cleanup() {
  if [ -n "$server_pid" ] && kill -0 "$server_pid" 2>/dev/null; then
    kill "$server_pid" 2>/dev/null || true
    wait "$server_pid" 2>/dev/null || true
  fi
  case "$staging" in "$project_root"/.runtime/.setup-*) rm -rf -- "$staging" ;; esac
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
fail() { printf 'proFILEr: %s\n' "$*" >&2; exit 1; }
for required in curl tar; do command -v "$required" >/dev/null 2>&1 || fail "Install $required and try again."; done
hash_file() {
  if command -v sha256sum >/dev/null 2>&1; then sha256sum "$1" | awk '{print $1}'
  elif command -v shasum >/dev/null 2>&1; then shasum -a 256 "$1" | awk '{print $1}'
  else fail 'Install sha256sum or shasum to verify the official runtime.'; fi
}
node_version='22.23.3'
system=$(uname -s)
machine=$(uname -m)
case "$system:$machine" in
  Darwin:arm64|Darwin:aarch64)
    target='darwin-arm64'; archive_hash='23b25245dcfb9af7262f8ff142e9e2e0af025368117329e7a7458a51e5922f53' ;;
  Darwin:x86_64)
    target='darwin-x64'; archive_hash='8a677b0219178efd6eb0e475457c4afb452b521a92f6e67845a73bd85727f2a8' ;;
  Linux:x86_64)
    target='linux-x64'; archive_hash='1084aa36196bba4c3a5e69a1ee388a6e4ff729dad09445fbcd434b28fe3c24af' ;;
  Linux:arm64|Linux:aarch64)
    target='linux-arm64'; archive_hash='5ced2d48d1d7198739b7f86804de0171aefb6823b684b12341d3321afc3cb0b2' ;;
  Linux:armv7l)
    target='linux-armv7l'; archive_hash='8b99058ec6f4e372b9887f8ecb577a292adb132d59e5104356428a758fdb126c' ;;
  *) fail "Unsupported platform: $system $machine. Use Node.js 22+ and node server.mjs." ;;
esac
if [ "$system" = Linux ] && { ldd --version 2>&1 || true; } | grep -qi musl; then
  if [ "$machine" = x86_64 ]; then
    target='linux-x64-musl'; archive_hash='633f49a4f388c5f9564d56d9c0f5ffa394346d92ca0076fe21cf776ece1988bc'
  else
    fail 'Automatic musl setup supports x64 only. Install Node.js 22+ from your distribution and run node server.mjs.'
  fi
fi
runtime_name="node-v$node_version-$target"
runtime_path="$project_root/.runtime/$runtime_name"
node_path="$runtime_path/bin/node"
if [ ! -f "$node_path" ]; then
  printf 'Preparing Node.js %s (%s). Internet is needed only for this first setup.\n' "$node_version" "$target"
  mkdir -p -- "$project_root/.runtime"
  staging=$(mktemp -d "$project_root/.runtime/.setup-XXXXXX")
  archive="$staging/node.tar.gz"
  curl --fail --location --proto '=https' --tlsv1.2 --connect-timeout 20 --max-time 300 --retry 2 \
    "https://nodejs.org/dist/v$node_version/$runtime_name.tar.gz" --output "$archive"
  [ "$(hash_file "$archive")" = "$archive_hash" ] || fail 'Node.js download checksum mismatch. Nothing will be executed.'
  tar -xzf "$archive" -C "$staging"
  extracted="$staging/$runtime_name"
  [ -f "$extracted/bin/node" ] && [ ! -L "$extracted/bin/node" ] || fail 'Invalid Node.js archive.'
  # Store the verified executable digest before installing the runtime atomically.
  hash_file "$extracted/bin/node" > "$extracted/.profiler-node-sha256"
  [ ! -e "$runtime_path" ] || fail 'Runtime folder already exists but is incomplete. Remove .runtime and retry.'
  mv -- "$extracted" "$runtime_path"
fi
[ -f "$runtime_path/.profiler-node-sha256" ] || fail 'Runtime checksum is missing. Remove .runtime and retry.'
[ "$(hash_file "$node_path")" = "$(cat "$runtime_path/.profiler-node-sha256")" ] || fail 'Cached Node.js checksum mismatch. Remove .runtime and retry.'
[ "$("$node_path" --version)" = "v$node_version" ] || fail 'Node.js could not run. Check OS requirements in QUICKSTART.md.'
if [ "$setup_only" -eq 1 ]; then printf 'Node.js is ready: %s\n' "$node_path"; exit 0; fi
port=${PORT:-4310}
case "$port" in ''|*[!0-9]*) fail 'PORT must be an integer between 1 and 65535.' ;; esac
[ "${#port}" -le 5 ] || fail 'PORT must be between 1 and 65535.'
port=$((10#$port))
[ "$port" -ge 1 ] && [ "$port" -le 65535 ] || fail 'PORT must be between 1 and 65535.'
export PORT="$port"
browser_url="http://localhost:$port"
"$node_path" server.mjs &
server_pid=$!
ready=0
for ((attempt=0; attempt<40; attempt++)); do
  sleep 0.25
  kill -0 "$server_pid" 2>/dev/null || fail 'Server could not start. Check the message above; the port may already be in use.'
  if curl --fail --silent --max-time 2 "http://127.0.0.1:$port/api/info" | "$node_path" -e \
    'let text="";process.stdin.on("data",x=>text+=x);process.stdin.on("end",()=>{try{process.exit(JSON.parse(text).name==="proFILEr"?0:1)}catch{process.exit(1)}})'; then
    ready=1; break
  fi
done
[ "$ready" -eq 1 ] || fail 'Server did not become ready. Check HOST and PORT settings.'
if [ "$no_browser" -eq 0 ]; then
  if [ "$system" = Darwin ]; then open "$browser_url" >/dev/null 2>&1 || true
  elif [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ] && command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$browser_url" >/dev/null 2>&1 &
  fi
fi
printf 'proFILEr is running at %s. Keep this terminal open. Press Ctrl+C to stop.\n' "$browser_url"
wait "$server_pid"
