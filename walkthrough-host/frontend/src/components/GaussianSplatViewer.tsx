import { useEffect, useRef, useState } from "react";

type Props = {
  /** Absolute or same-origin URL to a 3DGS `.ply` (Inria / Lyra-style). */
  plyUrl: string;
};

/**
 * Embeds @mkkellogg/gaussian-splats-3d Viewer. Requires `rootElement` (not `self`).
 */
export default function GaussianSplatViewer({ plyUrl }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<{ dispose?: () => void; stop?: () => void } | null>(null);
  const [phase, setPhase] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let cancelled = false;
    setPhase("loading");
    setErrMsg(null);

    (async () => {
      try {
        const G = await import("@mkkellogg/gaussian-splats-3d");
        if (cancelled) return;

        const viewer = new G.Viewer({
          rootElement: el,
          useBuiltInControls: true,
          cameraUp: [0, 1, 0],
          initialCameraPosition: [-4, 1, -6],
          initialCameraLookAt: [0, 0, 0],
          sharedMemoryForWorkers: false,
        });
        viewerRef.current = viewer;

        await viewer.init();
        if (cancelled) return;

        await viewer.addSplatScene(plyUrl, {
          splatAlphaRemovalThreshold: 5,
          showLoadingUI: true,
          progressiveLoad: true,
          position: [0, 0, 0],
          rotation: [0, 0, 0, 1],
          scale: [1, 1, 1],
        });
        if (cancelled) return;

        viewer.start();
        setPhase("ready");
      } catch (e: unknown) {
        if (!cancelled) {
          setPhase("error");
          setErrMsg(e instanceof Error ? e.message : String(e));
        }
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
  }, [plyUrl]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1, minHeight: 0 }}>
      <div style={{ fontSize: "0.9rem", opacity: 0.85 }}>
        <strong>Interactive 3D Gaussian splat</strong> — drag to orbit, scroll to zoom (viewer controls).
        {phase === "loading" && <span style={{ marginLeft: "0.75rem", color: "#9aa3b2" }}>Loading PLY…</span>}
        {phase === "ready" && <span style={{ marginLeft: "0.75rem", color: "#6b9e6b" }}>Ready</span>}
      </div>
      {errMsg && (
        <div style={{ color: "#f88", padding: "0.75rem", background: "#2a1515", borderRadius: 8 }}>
          <strong>Viewer error</strong>: {errMsg}
        </div>
      )}
      <div
        ref={rootRef}
        style={{
          flex: 1,
          minHeight: 480,
          width: "100%",
          position: "relative",
          borderRadius: 8,
          overflow: "hidden",
          background: "#08090c",
          border: "1px solid #252830",
        }}
      />
    </div>
  );
}
