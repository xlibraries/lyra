from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class JobPublic(BaseModel):
    id: str
    status: JobStatus
    created_at: datetime
    updated_at: datetime
    message: str = ""
    error: str | None = None
    has_ply: bool = False
    has_preview_video: bool = False
    # Filenames in job output/ (debug: spot missing PLY vs orphaned preview).
    output_files: list[str] = Field(default_factory=list)


class JobCreateResponse(BaseModel):
    job: JobPublic


class HealthResponse(BaseModel):
    ok: bool = True
    lyra2_root_exists: bool
    lyra2_root: str
