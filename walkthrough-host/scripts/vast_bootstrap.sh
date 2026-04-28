#!/usr/bin/env bash
# Run ON the Linux GPU instance (e.g. Vast.ai). Installs Miniconda + Lyra-2 per upstream INSTALL.md
# and walkthrough-host backend. Not fully non-interactive if conda init required.
set -euo pipefail

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

echo ">>> Toolchain (gcc 13)"
CONDA_BACKUP_CXX="" conda install gcc=13.3.0 gxx=13.3.0 eigen zlib -c conda-forge -y

echo ">>> CUDA toolkit in conda (12.8)"
conda install cuda -c nvidia/label/cuda-12.8.0 -y
export CUDA_HOME="$CONDA_PREFIX"

echo ">>> PyTorch cu128"
pip install -q torch==2.7.1 torchvision==0.22.1 --extra-index-url https://download.pytorch.org/whl/cu128

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
pip install "git+https://github.com/microsoft/MoGe.git"

echo ">>> Transformer Engine"
pip install --no-build-isolation "transformer_engine[pytorch]"
ln -sf "$SITE/nvidia/cuda_runtime" "$SITE/nvidia/cudart" 2>/dev/null || true

echo ">>> FlashAttention (slow — often 15–40+ min)"
MAX_JOBS="${MAX_JOBS:-16}"
pip install --no-build-isolation --no-binary :all: "flash-attn==2.6.3"

echo ">>> VIPE + Depth Anything 3 [gs]"
USE_SYSTEM_EIGEN=1 pip install -q --no-build-isolation -e "lyra_2/_src/inference/vipe"
pip install -q --no-build-isolation -e "lyra_2/_src/inference/depth_anything_3[gs]"

echo ">>> Walkthrough-host backend"
HOST_BACKEND="$LYRA_ROOT/walkthrough-host/backend"
[[ -d "$HOST_BACKEND" ]] || die "walkthrough-host/backend missing at $HOST_BACKEND"
pip install -q -r "$HOST_BACKEND/requirements.txt"

echo ">>> Verify imports (may warn)"
export PYTHONPATH="$LYRA2_DIR"
python -c "import torch; print('torch', torch.__version__, 'cuda', torch.cuda.is_available())" || true
python -c "import flash_attn; print('flash_attn ok')" || die "flash_attn import failed"
python -c "import transformer_engine.pytorch; print('te ok')" || true

echo ""
echo "OK — Lyra env ready. Next:"
echo "  1) huggingface-cli download nvidia/Lyra-2.0 --include 'checkpoints/recon/*' --local-dir $LYRA2_DIR"
echo "  2) conda activate $ENV_NAME && export PYTHONPATH=$LYRA2_DIR && cd $HOST_BACKEND && uvicorn app.main:app --host 0.0.0.0 --port 8000"
echo "     Or: $LYRA_ROOT/walkthrough-host/scripts/start_api.sh"
