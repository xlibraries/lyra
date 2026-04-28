from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from threading import Thread

from app.config import Settings
from app.job_store import JobStore
from app.schemas import JobStatus


def _build_command(settings: Settings, input_video: Path, output_dir: Path) -> list[str]:
    py = settings.python_bin or sys.executable
    cmd: list[str] = [
        py,
        "-m",
        "lyra_2._src.inference.vipe_da3_gs_recon",
        "--input_video_path",
        str(input_video),
        "--output_dir",
        str(output_dir),
        "--force",
    ]
    if settings.max_frames > 0:
        cmd.extend(["--max_frames", str(settings.max_frames)])
    cmd.extend(["--da3_max_frames", str(settings.da3_max_frames)])
    if settings.da3_model_path:
        p = Path(settings.da3_model_path).expanduser().resolve()
        if p.is_file():
            cmd.extend(["--da3_model_path_custom", str(p)])
    return cmd


def run_reconstruction_job(job_id: str, settings: Settings, store: JobStore) -> None:
    jd = store.job_dir(job_id)
    input_candidates = list(jd.glob("input.*"))
    if not input_candidates:
        store.update(job_id, status=JobStatus.failed, message="Missing upload", error="No input video")
        return
    input_video = input_candidates[0]
    output_dir = jd / "output"

    store.update(job_id, status=JobStatus.processing, message="Running VIPE + DA3 + Gaussian reconstruction…")

    cmd = _build_command(settings, input_video, output_dir)
    env = dict(**os.environ)
    env["PYTHONPATH"] = str(settings.lyra2_root.resolve())

    try:
        proc = subprocess.run(
            cmd,
            cwd=str(settings.lyra2_root.resolve()),
            env=env,
            capture_output=True,
            text=True,
            timeout=None,
        )
    except Exception as e:
        store.update(
            job_id,
            status=JobStatus.failed,
            message="Worker crashed",
            error=str(e),
        )
        return

    log = ""
    if proc.stdout:
        log += proc.stdout
    if proc.stderr:
        log += "\n--- stderr ---\n" + proc.stderr

    if proc.returncode != 0:
        store.update(
            job_id,
            status=JobStatus.failed,
            message=f"Process exited {proc.returncode}",
            error=(proc.stderr or proc.stdout or "Unknown error")[-8000:],
            log_tail=log,
        )
        return

    ply = output_dir / "reconstructed_scene.ply"
    if not ply.is_file():
        store.update(
            job_id,
            status=JobStatus.failed,
            message="Finished but PLY missing",
            error="reconstructed_scene.ply not found",
            log_tail=log,
        )
        return

    store.update(
        job_id,
        status=JobStatus.completed,
        message="Reconstruction complete — open Explore",
        log_tail=log,
    )


def spawn_reconstruction_thread(job_id: str, settings: Settings, store: JobStore) -> None:
    t = Thread(target=run_reconstruction_job, args=(job_id, settings, store), daemon=True)
    t.start()
