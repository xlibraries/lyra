from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    lyra2_root: Path = Path(__file__).resolve().parents[3] / "Lyra-2"
    data_dir: Path = Path(__file__).resolve().parents[2] / "data"
    python_bin: str | None = None
    da3_model_path: str | None = None
    max_frames: int = 0
    da3_max_frames: int = 128
    upload_max_mb: int = 2048
    cors_origins: str = "http://127.0.0.1:5173,http://localhost:5173"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def cors_origins_list() -> list[str]:
    return [o.strip() for o in get_settings().cors_origins.split(",") if o.strip()]
