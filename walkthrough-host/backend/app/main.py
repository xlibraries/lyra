from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from app.config import cors_origins_list, get_settings
from app.job_store import JobStore
from app.schemas import HealthResponse, JobCreateResponse, JobPublic
from app.worker import spawn_reconstruction_thread

settings = get_settings()
store = JobStore(settings.data_dir)

app = FastAPI(title="Lyra Walkthrough Host", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins_list(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    root = settings.lyra2_root.resolve()
    return HealthResponse(lyra2_root_exists=root.is_dir(), lyra2_root=str(root))


@app.post("/api/jobs", response_model=JobCreateResponse)
async def create_job(file: UploadFile = File(...)) -> JobCreateResponse:
    if not file.filename:
        raise HTTPException(400, "Filename required")
    ext = Path(file.filename).suffix.lower()
    if ext not in {".mp4", ".mov", ".webm", ".mkv"}:
        raise HTTPException(400, "Use a video file (.mp4, .mov, .webm, .mkv)")

    max_bytes = settings.upload_max_mb * 1024 * 1024
    rec = store.create_job(file.filename)
    jd = store.job_dir(rec.id)
    dest = jd / f"input{ext}"

    size = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > max_bytes:
                    shutil.rmtree(jd, ignore_errors=True)
                    raise HTTPException(413, f"File larger than {settings.upload_max_mb} MB")
                out.write(chunk)
    except HTTPException:
        raise
    except Exception as e:
        shutil.rmtree(jd, ignore_errors=True)
        raise HTTPException(500, f"Save failed: {e}") from e

    spawn_reconstruction_thread(rec.id, settings, store)
    loaded = store.load(rec.id)
    assert loaded is not None
    return JobCreateResponse(job=JobPublic.model_validate(loaded.to_public(jd)))


@app.get("/api/jobs/{job_id}", response_model=JobPublic)
def get_job(job_id: str) -> JobPublic:
    rec = store.load(job_id)
    if rec is None:
        raise HTTPException(404, "Job not found")
    jd = store.job_dir(job_id)
    return JobPublic.model_validate(rec.to_public(jd))


@app.get("/api/jobs/{job_id}/ply")
def download_ply(job_id: str):
    rec = store.load(job_id)
    if rec is None:
        raise HTTPException(404, "Job not found")
    if rec.status.value != "completed":
        raise HTTPException(409, "Job not completed")
    ply = store.job_dir(job_id) / "output" / "reconstructed_scene.ply"
    if not ply.is_file():
        raise HTTPException(404, "PLY not found")
    return FileResponse(
        path=ply,
        filename="reconstructed_scene.ply",
        media_type="application/octet-stream",
    )


@app.get("/api/jobs/{job_id}/preview.mp4")
def download_preview(job_id: str):
    rec = store.load(job_id)
    if rec is None:
        raise HTTPException(404, "Job not found")
    mp4 = store.job_dir(job_id) / "output" / "gs_trajectory.mp4"
    if not mp4.is_file():
        raise HTTPException(404, "Preview video not found")
    return FileResponse(path=mp4, media_type="video/mp4", filename="gs_trajectory.mp4")


@app.get("/api/jobs/{job_id}/log")
def job_log(job_id: str):
    rec = store.load(job_id)
    if rec is None:
        raise HTTPException(404, "Job not found")
    return JSONResponse({"log": rec.log_tail or ""})
