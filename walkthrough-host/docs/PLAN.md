# Lyra Walkthrough Host — Project Plan

## Goal

Self-hosted web application: user uploads **one room walkthrough video** (e.g. a 360° or handheld capture). The system runs NVIDIA Lyra 2’s **reconstruction stack** (VIPE camera poses + Depth Anything 3 + 3D Gaussian Splatting) and serves an **interactive, first-person navigable** view in the browser.

## Scope boundaries

| In scope | Out of scope (for this host) |
|----------|-------------------------------|
| Video upload, job lifecycle, artifact serving | Lyra 2 **diffusion** video generation (`lyra2_zoomgs_inference`) — requires 14B checkpoints and different inputs (image + trajectory) |
| `vipe_da3_gs_recon` for arbitrary MP4 | Training, dataset prep |
| Web UI + API + optional Docker GPU image | macOS-native inference (CUDA required per upstream) |

## User journey

1. Open the web app.
2. Upload `.mp4` (or drag-drop).
3. Backend enqueues a job, runs `python -m lyra_2._src.inference.vipe_da3_gs_recon` inside `Lyra-2/` with `PYTHONPATH=.`.
4. Poll until status `completed`.
5. Open **Explore**: WebGL Gaussian splat viewer loads `reconstructed_scene.ply` from the API.

## Milestones (commits)

1. Documentation: this plan + architecture.
2. Backend: FastAPI, job store, file upload.
3. Backend: subprocess worker, Lyra env configuration.
4. Frontend: Vite + React shell, upload + status.
5. Frontend: 3D viewer integration + styling.
6. Docker: GPU-oriented `Dockerfile` + `compose` wiring.
7. Top-level README for operators (checkpoints, env vars, sample video).

## Dependencies on Lyra 2

Operators must complete [Lyra-2/INSTALL.md](../../Lyra-2/INSTALL.md) on the **same machine** (or inside the GPU container). Required artifacts:

- Python env with VIPE, DA3, CUDA PyTorch, etc.
- DA3 reconstruction checkpoint at `Lyra-2/checkpoints/recon/model.pt` (or override `DA3_MODEL_PATH`).

## Risks & mitigations

- **Long runs**: Reconstruction can take many minutes; jobs are async with persisted status.
- **Memory**: Large videos; expose `MAX_FRAMES`, `DA3_MAX_FRAMES` via env.
- **Browser PLY size**: Very large splats may be slow; optional future work: quantize / export `.splat`.

## Sample asset

Place a test clip at `walkthrough-host/samples/input.mp4` or use any path; the user referenced `~/Downloads/flam360.mp4` — copy locally for development if desired.
