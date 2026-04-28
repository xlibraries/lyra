import { NavLink, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";

export default function App() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          padding: "1rem 1.5rem",
          borderBottom: "1px solid #252830",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        <strong style={{ letterSpacing: "0.02em" }}>Lyra Walkthrough Host</strong>
        <nav style={{ display: "flex", gap: "1rem" }}>
          <NavLink
            to="/"
            end
            style={({ isActive }) => ({ opacity: isActive ? 1 : 0.7, textDecoration: "none" })}
          >
            Upload
          </NavLink>
        </nav>
        <span style={{ marginLeft: "auto", fontSize: "0.85rem", opacity: 0.6 }}>
          Video → VIPE + DA3 → Gaussian splat (Lyra-2)
        </span>
      </header>
      <main style={{ flex: 1, padding: "1.5rem" }}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/explore/:jobId" element={<ExplorePage />} />
        </Routes>
      </main>
      <footer style={{ padding: "0.75rem 1.5rem", borderTop: "1px solid #252830", fontSize: "0.8rem", opacity: 0.5 }}>
        Self-hosted; requires Linux + NVIDIA +{" "}
        <a href="https://github.com/nv-tlabs/lyra/tree/main/Lyra-2" target="_blank" rel="noreferrer">
          Lyra-2 install
        </a>
        . Multi-agent lanes: <code>walkthrough-host/docs/MULTI_AGENT.md</code>
      </footer>
    </div>
  );
}
