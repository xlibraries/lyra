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
# Default: skips Transformer Engine (not needed for video → splat; often breaks on Blackwell source builds).
./vast_bootstrap.sh
# Full Lyra 14B path (may fail on new GPUs until NVIDIA publishes matching TE wheels):
# SKIP_TRANSFORMER_ENGINE=0 ./vast_bootstrap.sh
```

The script **patches VIPE** `droid_net.py` after the editable install when upstream still passes `gdown.download(..., fuzzy=True)` (incompatible with **gdown ≥ 6**). If the patch step reports “expected block not found”, your submodule may already be fixed — open an issue with the file snippet.

If bootstrap stopped at **`transformer_engine_torch`**, pull the latest `vast_bootstrap.sh` (or set `SKIP_TRANSFORMER_ENGINE=1`) and re-run the script — earlier steps are idempotent.

**If FlashAttention failed to compile** (common on **Blackwell**): the walkthrough **`vipe_da3_gs_recon`** path does **not** use it. Pull the latest `vast_bootstrap.sh` (defaults to **`SKIP_FLASH_ATTN=1`**) and re-run the script, **or** resume from VIPE only:

```bash
cd /root/lyra/Lyra-2
export PYTHONPATH=/root/lyra/Lyra-2
USE_SYSTEM_EIGEN=1 pip install --no-build-isolation -e "lyra_2/_src/inference/vipe"
pip install --no-build-isolation -e "lyra_2/_src/inference/depth_anything_3[gs]"
pip install -r /root/lyra/walkthrough-host/backend/requirements.txt
python -m lyra_2._src.inference.vipe_da3_gs_recon --help
```

For **full Lyra 14B**, try a prebuilt wheel first: `SKIP_FLASH_ATTN=0` after editing the script to use `pip install flash-attn==2.6.3` (no `--no-binary :all:`), or install a newer `flash-attn` if your PyTorch/CUDA combo has wheels.

**If `depth_anything_3` editable install fails with `No module named 'pathspec'`:** Lyra’s `--no-deps` install omits hatchling’s dependencies. Run `pip install pathspec` then re-run the `pip install -e ...depth_anything_3[gs]` line (latest `vast_bootstrap.sh` does this automatically).

Fix any error at the step it prints; then:

```bash
# HuggingFace weights (needs `pip install huggingface_hub` and optionally `huggingface-cli login`)
hf download nvidia/Lyra-2.0 --include "checkpoints/recon/*" --local-dir /root/lyra/Lyra-2
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
