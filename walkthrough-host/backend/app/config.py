from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# walkthrough-host/ (backend lives in walkthrough-host/backend/app/)
_HOST_ROOT = Path(__file__).resolve().parents[2]


def _resolve_against_host_root(p: Path) -> Path:
    """Relative DATA_DIR / LYRA2_ROOT in .env are anchored here, not to process cwd (fixes PLY 404 when cwd is backend/)."""
    p = Path(p).expanduser()
    if p.is_absolute():
        return p.resolve()
    return (_HOST_ROOT / p).resolve()


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    lyra2_root: Path = Path(__file__).resolve().parents[3] / "Lyra-2"
    data_dir: Path = Path(__file__).resolve().parents[2] / "data"
    python_bin: str | None = None
    da3_model_path: str | None = None
    max_frames: int = 0
    # After VIPE/SLAM, DA3 nested-giant forward is VRAM-heavy; 128 views + full-res often OOMs on ~96GB.
    da3_max_frames: int = 48
    # Short-side cap for DA3 (see vipe_da3_gs_recon --max_resolution). 0 = omit flag = full resolution (highest OOM risk).
    da3_max_resolution: int = 0
    # GS trajectory MP4: GPU→CPU batch size (see vipe_da3_gs_recon --render_video_gpu_batch). Lower = less peak VRAM.
    render_video_gpu_batch: int = 16
    upload_max_mb: int = 2048
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"

    @model_validator(mode="after")
    def _anchor_relative_paths(self) -> "Settings":
        object.__setattr__(self, "data_dir", _resolve_against_host_root(self.data_dir))
        object.__setattr__(self, "lyra2_root", _resolve_against_host_root(self.lyra2_root))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()


def cors_origins_list() -> list[str]:
    return [o.strip() for o in get_settings().cors_origins.split(",") if o.strip()]
