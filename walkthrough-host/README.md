# Lyra Walkthrough Host

Self-hosted **upload a room walkthrough video → 3D Gaussian splat scene → browser exploration**.

This wraps Lyra-2’s reconstruction script [`vipe_da3_gs_recon`](../Lyra-2/lyra_2/_src/inference/vipe_da3_gs_recon.py) (VIPE poses + Depth Anything 3 + 3DGS). It does **not** run Lyra’s 14B diffusion generator (image/trajectory synthesis).

## Requirements

- **Linux + NVIDIA GPU** with Lyra-2 installed per [Lyra-2/INSTALL.md](../Lyra-2/INSTALL.md)
- DA3 reconstruction weights (e.g. `Lyra-2/checkpoints/recon/model.pt`) — see [Lyra-2 README](../Lyra-2/README.md)
- Python **3.10** environment that can import Lyra inference deps when `PYTHONPATH` points at `Lyra-2/`

## Quick start (development)

**Terminal 1 — backend** (use the same interpreter that can run Lyra, or set `PYTHON_BIN` in `.env`):

```bash
cd walkthrough-host/backend
cp .env.example .env
# Edit .env: LYRA2_ROOT, optional PYTHON_BIN, DA3_MODEL_PATH

pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — frontend**:

```bash
cd walkthrough-host/frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The Vite dev server proxies `/api` to port 8000.

**Remote GPU + local UI:** run the API on the machine with the GPU (e.g. Vast), then on your Mac run `ssh … -L 8000:localhost:8000` and `walkthrough-host/scripts/mac_run_frontend.sh` (or `npm run dev` in `frontend/`). See [docs/VAST_QUICKSTART.md](./docs/VAST_QUICKSTART.md) §2.

## End-to-end POC checklist

1. **Lyra-2 + weights:** `PYTHONPATH` points at `Lyra-2/`; DA3 recon checkpoint exists (e.g. `checkpoints/recon/model.pt` from Hugging Face `nvidia/Lyra-2.0`).
2. **Backend:** `cd walkthrough-host/backend && cp .env.example .env` — set `LYRA2_ROOT`, optional `PYTHON_BIN`, `DA3_MODEL_PATH`, `RENDER_VIDEO_GPU_BATCH` (lower if GS video encode OOMs).
3. **Run API:** `../scripts/start_api.sh` or `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
4. **Health:** `GET /api/health` → `lyra2_root_exists: true` and **`data_dir`** matches `walkthrough-host/data` on the GPU (if PLY 404 but files exist on disk, `DATA_DIR` / cwd was wrong — fixed in code for relative `.env` paths; restart API).
5. **UI:** `npm run dev` in `frontend/`, upload an MP4, wait for **completed**, open **3D viewer** (PLY + optional `gs_trajectory.mp4` preview).
6. **Remote GPU:** `docs/VAST_QUICKSTART.md` — `vast_bootstrap.sh` installs deps and applies the VIPE `gdown` compatibility patch after editable VIPE install.

## Single-origin production (optional)

Build the UI, then serve it from FastAPI:

```bash
cd walkthrough-host/frontend && npm run build
cd ../backend
export LYRA_WALKTHROUGH_STATIC="$(pwd)/../frontend/dist"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Use empty `VITE_API_BASE` in the built app (same origin). Rebuild after changing API URL.

## Remote GPU (Vast.ai, etc.)

See [docs/VAST_QUICKSTART.md](./docs/VAST_QUICKSTART.md) and `scripts/vast_bootstrap.sh`.

## Docker

See [docker-compose.yml](./docker-compose.yml). The default API image is **slim** and does **not** bundle Lyra. For real jobs, either extend the image with Lyra-2 or run `uvicorn` directly on the host with your conda environment.

## Multi-agent & external tools

- **Lanes for parallel coding agents:** [docs/MULTI_AGENT.md](./docs/MULTI_AGENT.md)
- **llm_wiki, Evolver, OpenSpace:** [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md)

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Lyra-2 path + resolved **`data_dir`** / `data_dir_exists` |
| POST | `/api/jobs` | multipart upload `file` |
| GET | `/api/jobs/{id}` | job status |
| GET | `/api/jobs/{id}/ply` | `reconstructed_scene.ply` (alias) |
| GET | `/api/jobs/{id}/reconstructed_scene.ply` | same file (use for splat viewers that sniff `.ply` in the URL) |
| GET | `/api/jobs/{id}/preview.mp4` | GS flythrough |
| GET | `/api/jobs/{id}/log` | last worker log tail |

## License

Apache-2.0 for this host code; Lyra-2 and model weights follow their respective licenses.
