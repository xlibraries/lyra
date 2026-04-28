#!/usr/bin/env bash
# Run ON the Linux GPU instance (e.g. Vast.ai). Installs Miniconda + Lyra-2 per upstream INSTALL.md
# and walkthrough-host backend. Not fully non-interactive if conda init required.
# Do not use `set -u`: conda gcc/gxx deactivate hooks reference unset CONDA_BACKUP_CXX.
set -eo pipefail

LYRA_ROOT="${LYRA_ROOT:-$HOME/lyra}"
LYRA2_DIR="${LYRA2_DIR:-$LYRA_ROOT/Lyra-2}"
CONDA_DIR="${CONDA_DIR:-$HOME/miniconda3}"
ENV_NAME="${ENV_NAME:-lyra2}"

die() { echo "ERROR: $*" >&2; exit 1; }

command -v nvidia-smi >/dev/null || die "nvidia-smi not found — check NVIDIA driver on host"
nvidia-smi

if [[ ! -d "$LYRA2_DIR" ]]; then
  die "Lyra-2 not found at $LYRA2_DIR — clone/rsync repo first (see VAST_QUICKSTART.md)"
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq git git-lfs wget curl ca-certificates build-essential cmake ninja-build \
  ffmpeg libgl1 libglib2.0-0 pkg-config || true

if [[ ! -x "$CONDA_DIR/bin/conda" ]]; then
  echo ">>> Installing Miniconda to $CONDA_DIR"
  wget -q https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O /tmp/miniconda.sh
  bash /tmp/miniconda.sh -b -p "$CONDA_DIR"
fi
# shellcheck source=/dev/null
source "$CONDA_DIR/etc/profile.d/conda.sh"

if ! conda env list | awk '{print $1}' | grep -qx "$ENV_NAME"; then
  echo ">>> Creating conda env $ENV_NAME"
  conda create -n "$ENV_NAME" python=3.10 pip cmake ninja libgl ffmpeg packaging -c conda-forge -y
fi
conda activate "$ENV_NAME"
export CONDA_BACKUP_CXX="${CONDA_BACKUP_CXX:-}"

echo ">>> Toolchain (gcc 13)"
CONDA_BACKUP_CXX="" conda install gcc=13.3.0 gxx=13.3.0 eigen zlib -c conda-forge -y

echo ">>> CUDA toolkit in conda (12.8)"
conda install cuda -c nvidia/label/cuda-12.8.0 -y
export CUDA_HOME="$CONDA_PREFIX"
# Prefer conda nvcc (matches PyTorch cu128). System CUDA (e.g. 13.x on hosts) breaks gsplat wheels/source builds.
export PATH="$CONDA_PREFIX/bin:${PATH:-}"

echo ">>> PyTorch cu128"
pip install torch==2.7.1 torchvision==0.22.1 --extra-index-url https://download.pytorch.org/whl/cu128

SITE="$CONDA_PREFIX/lib/python3.10/site-packages"
export CPATH="$CUDA_HOME/include:$SITE/nvidia/cudnn/include:$SITE/nvidia/nccl/include:${CPATH:-}"
export LD_LIBRARY_PATH="$CONDA_PREFIX/lib:$SITE/torch/lib:$SITE/nvidia/cuda_runtime/lib:$SITE/nvidia/cudnn/lib:$CUDA_HOME/lib64:${LD_LIBRARY_PATH:-}"
export CC="$CONDA_PREFIX/bin/x86_64-conda-linux-gnu-gcc"
export CXX="$CONDA_PREFIX/bin/x86_64-conda-linux-gnu-g++"

cd "$LYRA2_DIR"
if [[ ! -f lyra_2/_src/inference/vipe/pyproject.toml ]]; then
  die "VIPE submodule missing — run: git submodule update --init --recursive"
fi

echo ">>> Lyra requirements (no-deps batch — see Lyra-2/INSTALL.md)"
pip install --no-deps -r requirements.txt
# hatchling is listed but --no-deps omits its runtime deps; DA3 editable build needs these.
pip install pathspec pluggy trove-classifiers
pip install "git+https://github.com/microsoft/MoGe.git"

# Transformer Engine often fails to build from source on brand-new architectures (e.g. Blackwell).
# It is only needed for Lyra 14B Wan training/inference (wan2pt1), NOT for vipe_da3_gs_recon / walkthrough-host.
SKIP_TRANSFORMER_ENGINE="${SKIP_TRANSFORMER_ENGINE:-1}"
if [[ "$SKIP_TRANSFORMER_ENGINE" == "1" ]]; then
  echo ">>> Skipping Transformer Engine (recon / walkthrough path). Set SKIP_TRANSFORMER_ENGINE=0 to match full Lyra-2 INSTALL."
else
  echo ">>> Transformer Engine"
  pip install --no-build-isolation "transformer_engine[pytorch]"
  ln -sf "$SITE/nvidia/cuda_runtime" "$SITE/nvidia/cudart" 2>/dev/null || true
fi

# FlashAttention: source build often fails on very new GPUs (Blackwell) with Lyra's pinned 2.6.3.
# Not imported by vipe_da3_gs_recon; required for Lyra 14B Wan (wan2pt1 / attention.py).
SKIP_FLASH_ATTN="${SKIP_FLASH_ATTN:-1}"
if [[ "$SKIP_FLASH_ATTN" == "1" ]]; then
  echo ">>> Skipping FlashAttention (walkthrough / recon path). For full Lyra: SKIP_FLASH_ATTN=0 ./vast_bootstrap.sh"
else
  echo ">>> FlashAttention — try prebuilt wheel first"
  if ! pip install --no-build-isolation "flash-attn==2.6.3"; then
    echo ">>> Wheel unavailable; source build (slow, may fail on Blackwell)"
    MAX_JOBS="${MAX_JOBS:-16}"
    pip install --no-build-isolation --no-binary :all: "flash-attn==2.6.3" || die "FlashAttention install failed — set SKIP_FLASH_ATTN=1 for recon-only"
  fi
fi

echo ">>> VIPE + Depth Anything 3 [gs]"
USE_SYSTEM_EIGEN=1 pip install --no-build-isolation -e "lyra_2/_src/inference/vipe"

# gdown>=6 removed `fuzzy=`; upstream VIPE still passes fuzzy=True (TypeError on fresh installs).
_patch_vipe_droid_gdown() {
  local f="$LYRA2_DIR/lyra_2/_src/inference/vipe/vipe/slam/networks/droid_net.py"
  [[ -f "$f" ]] || return 0
  # Already patched (url + try/except) or upstream fixed.
  if grep -q 'url = "https://drive.google.com/file/d/1PpqVt1H4maBa_GbPJp4NwxRsd9jk-elh/view"' "$f" 2>/dev/null; then
    return 0
  fi
  if ! grep -q "fuzzy=True" "$f" 2>/dev/null; then
    return 0
  fi
  echo ">>> Patching VIPE droid_net.py for gdown>=6 (DroidSLAM checkpoint download)"
  export _LYRA_DROID_NET_PY="$f"
  python3 <<'PY'
from pathlib import Path
import os

path = Path(os.environ["_LYRA_DROID_NET_PY"])
text = path.read_text()
old = """            gdown.download(
                \"https://drive.google.com/file/d/1PpqVt1H4maBa_GbPJp4NwxRsd9jk-elh/view\",
                output=str(ckpt_path),
                fuzzy=True,
            )"""
new = """            url = \"https://drive.google.com/file/d/1PpqVt1H4maBa_GbPJp4NwxRsd9jk-elh/view\"
            try:
                gdown.download(url, output=str(ckpt_path), fuzzy=True)
            except TypeError:
                # gdown>=6 removed `fuzzy` (share-link id extraction is always on).
                gdown.download(url, output=str(ckpt_path))"""
if old not in text:
    raise SystemExit("patch: expected block not found (VIPE updated?) — edit droid_net.py manually")
path.write_text(text.replace(old, new, 1))
print("patch: ok")
PY
}
_patch_vipe_droid_gdown
unset _LYRA_DROID_NET_PY

pip install --no-build-isolation -e "lyra_2/_src/inference/depth_anything_3[gs]"

echo ">>> Walkthrough-host backend"
HOST_BACKEND="$LYRA_ROOT/walkthrough-host/backend"
[[ -d "$HOST_BACKEND" ]] || die "walkthrough-host/backend missing at $HOST_BACKEND"
pip install -r "$HOST_BACKEND/requirements.txt"

echo ">>> Verify imports (may warn)"
export PYTHONPATH="$LYRA2_DIR"
python -c "import torch; print('torch', torch.__version__, 'cuda', torch.cuda.is_available())" || true
if [[ "$SKIP_FLASH_ATTN" != "1" ]]; then
  python -c "import flash_attn; print('flash_attn ok')" || die "flash_attn import failed"
fi
if [[ "$SKIP_TRANSFORMER_ENGINE" != "1" ]]; then
  python -c "import transformer_engine.pytorch; print('te ok')" || true
fi
cd "$LYRA2_DIR"
python -m lyra_2._src.inference.vipe_da3_gs_recon --help >/dev/null && echo ">>> vipe_da3_gs_recon CLI OK" || die "vipe_da3_gs_recon --help failed (fix VIPE/DA3 installs above)"

echo ""
echo "OK — Lyra env ready. Next:"
echo "  1) huggingface-cli download nvidia/Lyra-2.0 --include 'checkpoints/recon/*' --local-dir $LYRA2_DIR"
echo "  2) conda activate $ENV_NAME && export PYTHONPATH=$LYRA2_DIR && cd $HOST_BACKEND && uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo "     Or: $LYRA_ROOT/walkthrough-host/scripts/start_api.sh"
