import fs from "node:fs";
import path from "node:path";
import express from "express";
import { env, isProduction, missingSarvamVars } from "./config/env";
import { opsRouter } from "./routes/ops";
import { sarvamProxyRouter } from "./routes/sarvamProxy";
import { voiceConfigRouter } from "./routes/voiceConfig";
import { voiceToolsRouter } from "./routes/voiceTools";

const app = express();
app.disable("x-powered-by");

// Sarvam proxy handles its own (raw) body parsing, so it is mounted before express.json().
app.use("/api/sarvam", sarvamProxyRouter);

app.use(express.json({ limit: "256kb" }));
app.use("/api/voice-tools", voiceToolsRouter);
app.use("/api/voice", voiceConfigRouter);
app.use("/api", opsRouter);
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Not found" });
});

// In production the backend also serves the built frontend (single-service deploy).
const frontendDist = path.resolve(__dirname, "../../frontend/dist");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { index: "index.html", maxAge: isProduction ? "1h" : 0 }));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api")) return next();
    res.sendFile(path.join(frontendDist, "index.html"));
  });
}

app.listen(env.port, () => {
  const missing = missingSarvamVars();
  console.log(`UAV-GPT backend listening on http://localhost:${env.port} (${env.nodeEnv})`);
  console.log(`  simulated data: 8 drones, 15 deliveries, 3 incidents`);
  console.log(`  live voice: ${missing.length === 0 ? "configured" : `NOT configured — missing ${missing.join(", ")}`}`);
  console.log(`  voice tools: ${env.toolSharedSecret ? "protected by SARVAM_TOOL_SHARED_SECRET" : "DISABLED — set SARVAM_TOOL_SHARED_SECRET"}`);
  console.log(`  frontend: ${fs.existsSync(frontendDist) ? "serving frontend/dist" : "not built (use the Vite dev server on :5173)"}`);
});
