import { useState } from "react";
import { useNavigate } from "react-router-dom";

/** Jump to `/explore/:jobId` for interactive 3DGS + preview. */
export default function ViewerGatePage() {
  const [id, setId] = useState("");
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: 520 }}>
      <h1 style={{ fontWeight: 600, fontSize: "1.35rem", marginTop: 0 }}>Open 3D Gaussian viewer</h1>
      <p style={{ opacity: 0.85 }}>
        Paste a completed job id (from upload or the server <code>data/jobs/</code> folder). The page loads the splat PLY in
        the embedded viewer and shows the flythrough MP4 if present.
      </p>
      <form
        style={{ display: "flex", gap: "0.75rem", marginTop: "1rem", flexWrap: "wrap", alignItems: "center" }}
        onSubmit={(e) => {
          e.preventDefault();
          const t = id.trim();
          if (t) navigate(`/explore/${t}`);
        }}
      >
        <input
          value={id}
          onChange={(e) => setId(e.target.value)}
          placeholder="e.g. c3a9f2b1-8e4d-4f1a-9c2d-flam360viewer"
          style={{
            flex: 1,
            minWidth: 240,
            padding: "0.5rem 0.65rem",
            borderRadius: 6,
            border: "1px solid #353945",
            background: "#14161c",
            color: "#e8eaed",
          }}
        />
        <button type="submit" style={{ padding: "0.5rem 1rem", borderRadius: 6 }}>
          Open viewer
        </button>
      </form>
    </div>
  );
}
