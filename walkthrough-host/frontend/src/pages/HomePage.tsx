import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createJob, getJob, health, type Job } from "../api";

export default function HomePage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [backend, setBackend] = useState<string | null>(null);
  const [openJobId, setOpenJobId] = useState("");

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

      <div
        style={{
          marginTop: "1.25rem",
          padding: "1rem",
          background: "#12141a",
          borderRadius: 8,
          border: "1px solid #252830",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>3D Gaussian viewer</div>
        <p style={{ margin: 0, opacity: 0.85, fontSize: "0.9rem" }}>
          Open an existing completed job (interactive splat + preview video).
        </p>
        <form
          style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}
          onSubmit={(e) => {
            e.preventDefault();
            const t = openJobId.trim();
            if (t) navigate(`/explore/${t}`);
          }}
        >
          <input
            value={openJobId}
            onChange={(e) => setOpenJobId(e.target.value)}
            placeholder="Job UUID"
            style={{
              flex: 1,
              minWidth: 200,
              padding: "0.45rem 0.6rem",
              borderRadius: 6,
              border: "1px solid #353945",
              background: "#0c0d10",
              color: "#e8eaed",
            }}
          />
          <button type="submit">Open</button>
          <Link to="/viewer" style={{ alignSelf: "center", fontSize: "0.9rem" }}>
            Full page →
          </Link>
        </form>
      </div>

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
          {job.status === "completed" && (job.has_ply || job.has_preview_video) && (
            <p style={{ marginTop: "1rem" }}>
              <Link to={`/explore/${job.id}`} style={{ fontWeight: 600 }}>
                Open 3D Gaussian viewer →
              </Link>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
