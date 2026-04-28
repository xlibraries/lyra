from __future__ import annotations

import json
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.schemas import JobStatus


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class JobRecord:
    id: str
    status: JobStatus
    created_at: str
    updated_at: str
    message: str = ""
    error: str | None = None
    input_filename: str = ""
    log_tail: str = ""

    def to_public(self, job_dir: Path) -> dict[str, Any]:
        out = Path(job_dir) / "output"
        ply = out / "reconstructed_scene.ply"
        mp4 = out / "gs_trajectory.mp4"
        output_files: list[str] = []
        if out.is_dir():
            output_files = sorted(p.name for p in out.iterdir() if p.is_file())
        d = asdict(self)
        d["status"] = self.status.value
        d["has_ply"] = ply.is_file()
        d["has_preview_video"] = mp4.is_file()
        d["output_files"] = output_files
        d.pop("input_filename", None)
        d.pop("log_tail", None)
        d["created_at"] = datetime.fromisoformat(self.created_at)
        d["updated_at"] = datetime.fromisoformat(self.updated_at)
        return d


class JobStore:
    def __init__(self, data_dir: Path) -> None:
        self.data_dir = data_dir
        self.jobs_dir = data_dir / "jobs"
        self.jobs_dir.mkdir(parents=True, exist_ok=True)

    def job_dir(self, job_id: str) -> Path:
        return self.jobs_dir / job_id

    def meta_path(self, job_id: str) -> Path:
        return self.job_dir(job_id) / "meta.json"

    def create_job(self, input_filename: str) -> JobRecord:
        job_id = str(uuid.uuid4())
        jd = self.job_dir(job_id)
        jd.mkdir(parents=True, exist_ok=True)
        (jd / "output").mkdir(exist_ok=True)
        now = _utcnow().isoformat()
        rec = JobRecord(
            id=job_id,
            status=JobStatus.pending,
            created_at=now,
            updated_at=now,
            message="Queued",
            input_filename=input_filename,
        )
        self._write(rec, jd)
        return rec

    def _write(self, rec: JobRecord, jd: Path | None = None) -> None:
        jd = jd or self.job_dir(rec.id)
        rec.updated_at = _utcnow().isoformat()
        self.meta_path(rec.id).write_text(
            json.dumps(asdict(rec), indent=2),
            encoding="utf-8",
        )

    def load(self, job_id: str) -> JobRecord | None:
        p = self.meta_path(job_id)
        if not p.is_file():
            return None
        raw = json.loads(p.read_text(encoding="utf-8"))
        return JobRecord(
            id=raw["id"],
            status=JobStatus(raw["status"]),
            created_at=raw["created_at"],
            updated_at=raw["updated_at"],
            message=raw.get("message", ""),
            error=raw.get("error"),
            input_filename=raw.get("input_filename", ""),
            log_tail=raw.get("log_tail", ""),
        )

    def update(
        self,
        job_id: str,
        *,
        status: JobStatus | None = None,
        message: str | None = None,
        error: str | None = None,
        log_tail: str | None = None,
    ) -> JobRecord | None:
        rec = self.load(job_id)
        if rec is None:
            return None
        if status is not None:
            rec.status = status
        if message is not None:
            rec.message = message
        if error is not None:
            rec.error = error
        if log_tail is not None:
            rec.log_tail = log_tail[-12000:]
        self._write(rec)
        return rec
