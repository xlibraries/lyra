# Multi-agent setup (non-overlapping lanes)

Use **one lane per parallel agent** so edits, searches, and commits do not collide. Paste the lane block into each agent’s first message.

## Lane definitions

| Lane ID | Allowed paths | Purpose |
|--------|----------------|---------|
| **LYRA_CORE** | `Lyra-1/`, `Lyra-2/` | Upstream Lyra training/inference, submodules, checkpoints layout — **not** the web host. |
| **HOST_APP** | `walkthrough-host/backend/`, `walkthrough-host/frontend/`, `walkthrough-host/docker/`, `walkthrough-host/data/` (runtime only) | Upload API, UI, containers, local job storage. |
| **HOST_DOCS** | `walkthrough-host/docs/`, `walkthrough-host/README.md` | Plans, architecture, integrations, this file. |
| **WALKTHROUGH_MONITOR** | Read-only: job logs, `GET /api/*`, `walkthrough-host/data/**`, remote `nvidia-smi` | Observer agent: triage failures, **no** `Lyra-2/**` edits. Cursor: rule **Walkthrough monitor agent** (`.cursor/rules/walkthrough-monitor-agent.mdc`). |
| **WALKTHROUGH_FIX** | `Lyra-2/**` and/or `walkthrough-host/**` per symptom | Remediation agent: minimal patches, repro with `walkthrough-host/env/flam360.mp4.env`. Cursor: rule **Walkthrough fix agent** (`.cursor/rules/walkthrough-fix-agent.mdc`). |
| **(scope hint)** | `walkthrough-host/**` | Cursor: rule **Walkthrough multi-agent lanes** (`.cursor/rules/walkthrough-multi-agent-lanes.mdc`) — opens when editing the host; points here. |
| **META** | `.cursor/rules/` (optional), repo-root `README.md` | Cross-cutting pointers only; avoid drive-by edits to Lyra inference code. |

**Rule:** An agent assigned **HOST_APP** must not modify `Lyra-2/lyra_2/**` except via a separate **LYRA_CORE** task and its own commit.

## Golden test clip (agents)

- Env file: `walkthrough-host/env/flam360.mp4.env` (`LYRA_WALKTHROUGH_TEST_VIDEO`, `LYRA_WALKTHROUGH_API`).
- Upload helper: `bash walkthrough-host/scripts/upload_test_video.sh` (after `set -a && source …/flam360.mp4.env && set +a`).

## Parallelism

- **Safe in parallel:** WALKTHROUGH_MONITOR + WALKTHROUGH_FIX (fix waits on monitor report); HOST_APP + HOST_DOCS; or LYRA_CORE + HOST_DOCS (docs only).
- **Avoid in parallel:** Two agents both editing `walkthrough-host/frontend/` — serialize or split by file (e.g. one owns `src/pages/Upload.tsx`, the other `Explore.tsx`).

## Git discipline

- One logical change set → **one commit** with a scoped message (`feat(walkthrough-host): …`, `docs(walkthrough-host): …`).
- Prefer branch `feature/walkthrough-host` (or sub-branches `feature/walkthrough-host/ui`) if multiple developers push.

## External repos (separate clones)

These live **outside** this tree by default. Agents working only on **xlibraries/llm_wiki**, **EvoMap/evolver**, or **xlibraries/OpenSpace** should use a **different workspace root** or a sibling directory, e.g. `~/src/llm_wiki`, and reference Lyra via docs — not nested git clones inside `lyra/` unless you intentionally add submodules.

## Evolver-specific

If using [Evolver](https://github.com/EvoMap/evolver), point it at a **single repo root** and keep blast radius clear:

- Option A: Run Evolver from `walkthrough-host/` with `memory/` (or a dedicated path) **gitignored**.
- Option B: Run from monorepo root but set evolution scope in prompts to `walkthrough-host/**` only.

## OpenSpace-specific

OpenSpace skills and MCP config should reference **absolute paths** to this repo’s `walkthrough-host/` and, if needed, `Lyra-2/`. Do not duplicate skill trees inside `Lyra-2/`.
