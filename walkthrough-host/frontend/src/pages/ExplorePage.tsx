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
        <p style={{ opacity: 0.8 }}>No PLY for this job — only the preview video may be available.</p>
      )}
    </div>
  );
}
