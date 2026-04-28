#!/usr/bin/env bash
set -euo pipefail
LYRA_ROOT="${LYRA_ROOT:-$HOME/lyra}"
export LYRA2_ROOT="${LYRA2_ROOT:-$LYRA_ROOT/Lyra-2}"
export DATA_DIR="${DATA_DIR:-$LYRA_ROOT/walkthrough-host/data}"
export PYTHONPATH="$LYRA2_ROOT${PYTHONPATH:+:$PYTHONPATH}"
export PYTORCH_CUDA_ALLOC_CONF="${PYTORCH_CUDA_ALLOC_CONF:-expandable_segments:True}"
# Use same Python as current shell (should be conda lyra2)
cd "$LYRA_ROOT/walkthrough-host/backend"
# Idempotent: fixes partial bootstraps (e.g. missing pydantic-settings).
pip install -q -r requirements.txt
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
