import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Dev-only: where Vite forwards `/api` (your SSH tunnel local port must match). */
const defaultProxy = "http://127.0.0.1:8000";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.WALKTHROUGH_PROXY_TARGET?.trim() || defaultProxy;

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          timeout: 600_000,
          proxyTimeout: 600_000,
        },
      },
    },
    optimizeDeps: {
      exclude: ["@mkkellogg/gaussian-splats-3d"],
    },
  };
});
