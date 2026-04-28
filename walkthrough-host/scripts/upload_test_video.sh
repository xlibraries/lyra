#!/usr/bin/env bash
# POST the fixture video from LYRA_WALKTHROUGH_TEST_VIDEO to the walkthrough API.
set -euo pipefail
VIDEO="${LYRA_WALKTHROUGH_TEST_VIDEO:-}"
API="${LYRA_WALKTHROUGH_API:-http://127.0.0.1:8000}"
if [[ -z "$VIDEO" || ! -f "$VIDEO" ]]; then
  echo "Set LYRA_WALKTHROUGH_TEST_VIDEO to an existing file (see walkthrough-host/env/flam360.mp4.env)" >&2
  exit 1
fi
echo ">>> POST $VIDEO -> $API/api/jobs"
curl -sS -X POST "${API}/api/jobs" -F "file=@${VIDEO}"
echo ""
