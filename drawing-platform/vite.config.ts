import { fileURLToPath } from "node:url";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5173,
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), fileURLToPath(new URL("../md", import.meta.url))],
    },
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
  build: {
    sourcemap: true,
  },
});
