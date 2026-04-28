#!/usr/bin/env bash
# Run on your Mac. Vite proxies /api → WALKTHROUGH_PROXY_TARGET (default http://127.0.0.1:8000).
# Match your SSH -L LOCAL:localhost:REMOTE to LOCAL and the API port on Vast (see start_api.sh PORT).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export WALKTHROUGH_PROXY_TARGET="${WALKTHROUGH_PROXY_TARGET:-http://127.0.0.1:8000}"
cd "$ROOT/frontend"
echo ">>> Lyra Walkthrough UI — open http://localhost:5173/"
echo ">>> Vite /api proxy → ${WALKTHROUGH_PROXY_TARGET}"
echo ">>> If you use e.g. ssh -L 8080:localhost:8080, run: WALKTHROUGH_PROXY_TARGET=http://127.0.0.1:8080 $0"
echo ">>> Optional incremental PLY load: VITE_SPLAT_PROGRESSIVE_LOAD=true (can stall on slow tunnels)."
exec npm run dev
