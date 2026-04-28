# External tools and repos

Short guide for using these projects **alongside** Lyra Walkthrough Host without mixing their code into `Lyra-2/`.

## [xlibraries/llm_wiki](https://github.com/xlibraries/llm_wiki)

**What it is:** Desktop “LLM Wiki” — incremental wiki + knowledge graph from documents (Tauri, optional LanceDB, clipper, etc.).

**Use with Lyra host:** Ingest operational docs as sources: `Lyra-2/INSTALL.md`, `Lyra-2/README.md`, `walkthrough-host/README.md`, runbooks. You get searchable, linked pages for **install, checkpoints, env vars, and troubleshooting** instead of one-off RAG chats.

**Boundary:** Keep the wiki vault **outside** this repo or in a ignored path; do not commit generated wiki output into `lyra` unless you intend to version it.

## [EvoMap/evolver](https://github.com/EvoMap/evolver)

**What it is:** GEP (Genome Evolution Protocol) CLI — reads `./memory/`, emits **protocol prompts** to stdout; does not auto-edit your repo. Optional EvoMap Hub for skills.

**Use with Lyra host:** Run Evolver with memory fed from **walkthrough-host** work (viewer bugs, pipeline timeouts, CUDA errors). Use **`evolver setup-hooks`** for Cursor so evolution cycles stay scoped. Good for **iterating the FastAPI worker and React viewer** under clear git commits.

**Boundary:** Add `memory/` or `.evolver-memory/` to `.gitignore` in the tree where Evolver runs.

## [xlibraries/OpenSpace](https://github.com/xlibraries/OpenSpace)

**What it is:** **Agent skill evolution** framework (MCP `openspace-mcp`, skill registry, cloud at open-space.cloud) — **not** the NASA globe OpenSpace. Fork of HKUDS/OpenSpace.

**Use with Lyra host:** Teach agents **how to run** reconstruction (`vipe_da3_gs_recon`), verify outputs (`reconstructed_scene.ply`), and operate the host API via **custom skills / MCP tools** that shell or HTTP-call your stack. Evolution captures **failure patterns** (bad uploads, OOM, missing checkpoints).

**Boundary:** OpenSpace lives in its **own clone**. Wire paths via `OPENSPACE_WORKSPACE` / host skill dirs to this repo; do not vendor OpenSpace under `walkthrough-host/`.

## Summary

| Project   | Role next to Lyra host        | Code location        |
|-----------|-------------------------------|----------------------|
| llm_wiki  | Ops + docs knowledge base     | Separate app / vault |
| Evolver   | Structured improvement loops  | CLI + local memory   |
| OpenSpace | Agent skills + MCP evolution  | Separate clone       |

The **walkable 3D experience** remains **this repo’s viewer + Lyra-2 reconstruction**; the three projects improve **how teams build and run** that stack, not the splat math itself.
