#!/usr/bin/env bash
set -euo pipefail
LYRA_ROOT="${LYRA_ROOT:-$HOME/lyra}"
export LYRA2_ROOT="${LYRA2_ROOT:-$LYRA_ROOT/Lyra-2}"
export DATA_DIR="${DATA_DIR:-$LYRA_ROOT/walkthrough-host/data}"
export PYTHONPATH="${PYTHONPATH:-}:$LYRA2_ROOT"
# Use same Python as current shell (should be conda lyra2)
cd "$LYRA_ROOT/walkthrough-host/backend"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
