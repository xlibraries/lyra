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

## Single-origin production (optional)

Build the UI, then serve it from FastAPI:

```bash
cd walkthrough-host/frontend && npm run build
cd ../backend
export LYRA_WALKTHROUGH_STATIC="$(pwd)/../frontend/dist"
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Use empty `VITE_API_BASE` in the built app (same origin). Rebuild after changing API URL.

## Docker

See [docker-compose.yml](./docker-compose.yml). The default API image is **slim** and does **not** bundle Lyra. For real jobs, either extend the image with Lyra-2 or run `uvicorn` directly on the host with your conda environment.

## Multi-agent & external tools

- **Lanes for parallel coding agents:** [docs/MULTI_AGENT.md](./docs/MULTI_AGENT.md)
- **llm_wiki, Evolver, OpenSpace:** [docs/INTEGRATIONS.md](./docs/INTEGRATIONS.md)

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Lyra-2 path check |
| POST | `/api/jobs` | multipart upload `file` |
| GET | `/api/jobs/{id}` | job status |
| GET | `/api/jobs/{id}/ply` | `reconstructed_scene.ply` |
| GET | `/api/jobs/{id}/preview.mp4` | GS flythrough |
| GET | `/api/jobs/{id}/log` | last worker log tail |

## License

Apache-2.0 for this host code; Lyra-2 and model weights follow their respective licenses.
