import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import GaussianSplatViewer from "../components/GaussianSplatViewer";
import { getJob, plyUrl, previewVideoUrl, type Job } from "../api";

export default function ExplorePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<Job | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    getJob(jobId)
      .then(setJob)
      .catch((e) => setLoadErr(e instanceof Error ? e.message : String(e)));
  }, [jobId]);

  if (!jobId) return <p>Missing job id.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 8rem)", gap: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <Link to="/">← Upload</Link>
        <code>{jobId}</code>
        {job && (
          <span style={{ opacity: 0.8 }}>
            {job.status} — {job.message}
          </span>
        )}
      </div>

      {!loadErr && !job && (
        <p style={{ opacity: 0.85 }}>Loading job… If this hangs, the UI cannot reach the API (check Vite proxy port matches your SSH tunnel, e.g. <code>WALKTHROUGH_PROXY_TARGET=http://127.0.0.1:8080</code>).</p>
      )}

      {job?.status === "processing" && (
        <p style={{ opacity: 0.85 }}>Reconstruction still running — preview and 3D viewer appear when the job completes.</p>
      )}

      {job?.status === "failed" && (
        <div style={{ color: "#f88", padding: "0.75rem", background: "#2a1515", borderRadius: 8 }}>
          <strong>Job failed</strong>
          {job.error && (
            <pre style={{ marginTop: "0.5rem", whiteSpace: "pre-wrap", fontSize: "0.85rem" }}>{job.error}</pre>
          )}
        </div>
      )}

      {loadErr && (
        <div style={{ color: "#f88", padding: "0.75rem", background: "#2a1515", borderRadius: 8 }}>
          <strong>Job</strong>: {loadErr}
        </div>
      )}

      {job?.status === "completed" && job.has_preview_video && (
        <div>
          <div style={{ fontSize: "0.85rem", opacity: 0.75, marginBottom: "0.35rem" }}>Flythrough preview (video)</div>
          <video
            src={previewVideoUrl(jobId)}
            controls
            style={{ maxHeight: 200, borderRadius: 8, width: "100%", maxWidth: 560 }}
            title="GS flythrough preview"
          />
        </div>
      )}

      {job?.status === "completed" && job.has_ply && (
        <>
          <div style={{ fontSize: "0.85rem", opacity: 0.75 }}>
            Download:{" "}
            <a href={plyUrl(jobId)} download="reconstructed_scene.ply">
              reconstructed_scene.ply
            </a>
          </div>
          <GaussianSplatViewer plyUrl={plyUrl(jobId)} />
        </>
      )}

      {job?.status === "completed" && !job.has_ply && (
        <div
          style={{
            padding: "0.85rem",
            background: "#2a2210",
            border: "1px solid #5c4d1a",
            borderRadius: 8,
            fontSize: "0.9rem",
            lineHeight: 1.5,
          }}
        >
          <strong>No PLY on disk</strong> for this job, so the 3D viewer cannot load.{" "}
          {job.has_preview_video ? (
            <>
              A flythrough <code>gs_trajectory.mp4</code> is present without <code>reconstructed_scene.ply</code> — usually
              the PLY was deleted, the job folder was copied incompletely, or the API <code>DATA_DIR</code> does not match
              where the worker wrote files. Re-run reconstruction (new upload) on the same host.
            </>
          ) : (
            <>Only partial outputs may exist.</>
          )}
          {job.output_files && job.output_files.length > 0 && (
            <div style={{ marginTop: "0.5rem", opacity: 0.9 }}>
              Files in <code>output/</code>: <code>{job.output_files.join(", ")}</code>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
