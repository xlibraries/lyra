import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getJob, plyUrl, previewVideoUrl, type Job } from "../api";

export default function ExplorePage() {
  const { jobId } = useParams<{ jobId: string }>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [viewerErr, setViewerErr] = useState<string | null>(null);
  const viewerRef = useRef<{ dispose?: () => void } | null>(null);

  useEffect(() => {
    if (!jobId) return;
    getJob(jobId)
      .then(setJob)
      .catch((e) => setViewerErr(e instanceof Error ? e.message : String(e)));
  }, [jobId]);

  useEffect(() => {
    if (!jobId || !job || job.status !== "completed" || !job.has_ply) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    setViewerErr(null);

    (async () => {
      try {
        const G = await import("@mkkellogg/gaussian-splats-3d");
        if (cancelled) return;

        const splatUrl = plyUrl(jobId);
        const Viewer = G.Viewer;
        const viewer = new Viewer({
          self: el,
          useBuiltInControls: true,
          cameraUp: [0, 1, 0],
          initialCameraPosition: [-4, 1, -6],
          initialCameraLookAt: [0, 0, 0],
          sharedMemoryForWorkers: false,
        });
        viewerRef.current = viewer;

        await viewer.init();
        if (cancelled) return;

        await viewer.addSplatScene(splatUrl, {
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: true,
          position: [0, 0, 0],
          orientation: [1, 0, 0, 0],
          scale: [1, 1, 1],
        });
        if (cancelled) return;
        viewer.start();
      } catch (e: unknown) {
        if (!cancelled) setViewerErr(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
      const v = viewerRef.current as { dispose?: () => void; stop?: () => void } | null;
      viewerRef.current = null;
      try {
        v?.dispose?.();
        v?.stop?.();
      } catch {
        /* ignore */
      }
      el.replaceChildren();
    };
  }, [jobId, job?.status, job?.has_ply]);

  if (!jobId) return <p>Missing job id.</p>;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 8rem)", gap: "0.75rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
        <Link to="/">← Upload</Link>
        <code>{jobId}</code>
        {job && (
          <span style={{ opacity: 0.8 }}>
            {job.status} — {job.message}
          </span>
        )}
      </div>

      {job?.status === "completed" && job.has_preview_video && (
        <video
          src={previewVideoUrl(jobId)}
          controls
          style={{ maxHeight: 200, borderRadius: 8 }}
          title="GS flythrough preview"
        />
      )}

      {viewerErr && (
        <div style={{ color: "#f88", padding: "0.75rem", background: "#2a1515", borderRadius: 8 }}>
          <strong>Viewer</strong>: {viewerErr}
          <p style={{ margin: "0.5rem 0 0", fontSize: "0.9rem" }}>
            You can still download the asset:{" "}
            <a href={plyUrl(jobId)} download>
              reconstructed_scene.ply
            </a>
          </p>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 420,
          borderRadius: 8,
          overflow: "hidden",
          background: "#08090c",
          border: "1px solid #252830",
        }}
      />
    </div>
  );
}
