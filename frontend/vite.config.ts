import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // All /api traffic (dashboard data + Sarvam proxy) goes to the Express backend in dev.
    proxy: { "/api": { target: "http://localhost:3001", changeOrigin: true } },
  },
  build: { outDir: "dist", sourcemap: false },
});
