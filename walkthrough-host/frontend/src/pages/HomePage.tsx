import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createJob, getJob, health, type Job } from "../api";

export default function HomePage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [backend, setBackend] = useState<string | null>(null);

  useEffect(() => {
    health()
      .then((h) => {
        setBackend(
          h.lyra2_root_exists ? `Lyra-2 OK at ${h.lyra2_root}` : `Lyra-2 path missing: ${h.lyra2_root}`,
        );
      })
      .catch(() => setBackend("API unreachable — start backend (uvicorn)"));
  }, []);

  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;
    const t = setInterval(async () => {
      try {
        const j = await getJob(job.id);
        setJob(j);
      } catch {
        /* ignore poll errors */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [job]);

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file) return;
      setErr(null);
      setBusy(true);
      try {
        const { job: j } = await createJob(file);
        setJob(j);
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [file],
  );

  return (
    <div style={{ maxWidth: 640 }}>
      <h1 style={{ fontWeight: 600, fontSize: "1.5rem", marginTop: 0 }}>Room video upload</h1>
      <p style={{ opacity: 0.85 }}>
        Upload a single walkthrough clip. The worker runs Lyra-2’s <code>vipe_da3_gs_recon</code> (VIPE poses + DA3 +
        3DGS). This can take several minutes on a data-center GPU.
      </p>
      <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>{backend}</p>

      <form onSubmit={onSubmit} style={{ marginTop: "1.5rem" }}>
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={busy}
        />
        <button type="submit" disabled={!file || busy} style={{ marginLeft: "1rem" }}>
          {busy ? "Uploading…" : "Start reconstruction"}
        </button>
      </form>

      {err && (
        <pre style={{ color: "#f88", marginTop: "1rem", whiteSpace: "pre-wrap" }}>{err}</pre>
      )}

      {job && (
        <div style={{ marginTop: "1.5rem", padding: "1rem", background: "#14161c", borderRadius: 8 }}>
          <div>
            <strong>Job</strong> <code>{job.id}</code>
          </div>
          <div style={{ marginTop: "0.5rem" }}>
            Status: <strong>{job.status}</strong>
          </div>
          <div style={{ marginTop: "0.5rem", opacity: 0.9 }}>{job.message}</div>
          {job.error && (
            <pre style={{ color: "#f88", marginTop: "0.75rem", fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
              {job.error}
            </pre>
          )}
          {job.status === "completed" && job.has_ply && (
            <p style={{ marginTop: "1rem" }}>
              <Link to={`/explore/${job.id}`}>Open walkable view →</Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
