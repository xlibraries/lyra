/** API paths; Vite dev server proxies /api to FastAPI. In production set VITE_API_BASE. */
export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") ?? "";
  if (!path.startsWith("/")) path = `/${path}`;
  return `${base}${path}`;
}

export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type Job = {
  id: string;
  status: JobStatus;
  created_at: string;
  updated_at: string;
  message: string;
  error: string | null;
  has_ply: boolean;
  has_preview_video: boolean;
};

export async function health(): Promise<{ ok: boolean; lyra2_root_exists: boolean; lyra2_root: string }> {
  const r = await fetch(apiUrl("/api/health"));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function createJob(file: File): Promise<{ job: Job }> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(apiUrl("/api/jobs"), { method: "POST", body: fd });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

export async function getJob(id: string): Promise<Job> {
  const r = await fetch(apiUrl(`/api/jobs/${id}`));
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

/** Path must end in `.ply` for @mkkellogg/gaussian-splats-3d format detection. */
export function plyUrl(jobId: string): string {
  return apiUrl(`/api/jobs/${jobId}/reconstructed_scene.ply`);
}

export function previewVideoUrl(jobId: string): string {
  return apiUrl(`/api/jobs/${jobId}/preview.mp4`);
}
