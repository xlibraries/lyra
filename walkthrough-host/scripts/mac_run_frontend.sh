#!/usr/bin/env bash
# Run on your Mac. Uses Vite's /api → http://127.0.0.1:8000 proxy (see frontend/vite.config.ts).
# Prerequisite: another terminal has an SSH tunnel to the GPU box, e.g.:
#   ssh -p YOUR_PORT root@YOUR_VAST_HOST -L 8000:localhost:8000
# And on Vast: ./walkthrough-host/scripts/start_api.sh (API on port 8000).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/frontend"
echo ">>> Lyra Walkthrough UI — open http://localhost:5173/"
echo ">>> API must be reachable at http://127.0.0.1:8000 (SSH -L 8000:localhost:8000 to Vast)."
exec npm run dev
