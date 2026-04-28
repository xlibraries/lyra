# Vast.ai / remote GPU — quick start

**Reality check:** A **first-time** Lyra-2 install (FlashAttention compile, CUDA extensions) often takes **45–120+ minutes**, not 30. Use this doc to **parallelize** steps and avoid dead ends. Repeat runs are much faster.

## 0. Get this repo onto the instance

Official `nv-tlabs/lyra` may not include `walkthrough-host` until merged. Pick one:

**A — Rsync from your Mac** (includes `walkthrough-host`):

```bash
rsync -avz --exclude node_modules --exclude .git/objects \
  -e "ssh -p YOUR_PORT" \
  /path/to/lyra/ root@ssh6.vast.ai:/root/lyra/
```

**B — Git clone + your branch** (if pushed to a fork):

```bash
git clone --recursive https://github.com/YOURUSER/lyra.git && cd lyra
git checkout feature/walkthrough-host
git submodule update --init --recursive
```

## 1. One-shot bootstrap (on the GPU box)

```bash
cd /root/lyra/walkthrough-host/scripts
chmod +x vast_bootstrap.sh start_api.sh
./vast_bootstrap.sh
```

Fix any error at the step it prints; then:

```bash
# HuggingFace weights (needs `pip install huggingface_hub` and optionally `huggingface-cli login`)
huggingface-cli download nvidia/Lyra-2.0 --include "checkpoints/recon/*" --local-dir /root/lyra/Lyra-2
```

## 2. Run API + tunnel from Mac

**On GPU:**

```bash
cd /root/lyra/walkthrough-host/scripts
export LYRA2_ROOT=/root/lyra/Lyra-2
export DATA_DIR=/root/lyra/walkthrough-host/data
./start_api.sh
```

**On Mac** (adjust port and Vast SSH flags):

```bash
ssh -p 29483 root@ssh6.vast.ai -L 8000:localhost:8000
```

Open `http://127.0.0.1:8000/api/health` — `lyra2_root_exists` should be true.

## 3. Frontend (optional, on Mac)

Point Vite at the tunnel:

```bash
cd walkthrough-host/frontend
VITE_API_BASE=http://127.0.0.1:8000 npm run dev
```

Or build with empty `VITE_API_BASE` and set `LYRA_WALKTHROUGH_STATIC` on the server (see main README).

## 4. If you are time-limited

- Start **`vast_bootstrap.sh`** and in **another shell** run **`huggingface-cli download ...`** so weights pull while FlashAttention builds.
- Use a machine with **fast local disk**; FlashAttention and extension builds are **disk + CPU** heavy.
