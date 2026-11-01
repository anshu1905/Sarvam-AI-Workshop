"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const express_1 = __importDefault(require("express"));
const env_1 = require("./config/env");
const ops_1 = require("./routes/ops");
const sarvamProxy_1 = require("./routes/sarvamProxy");
const voiceConfig_1 = require("./routes/voiceConfig");
const voiceTools_1 = require("./routes/voiceTools");
const voiceTurn_1 = require("./routes/voiceTurn");
const app = (0, express_1.default)();
app.disable("x-powered-by");
// Sarvam proxy handles its own (raw) body parsing, so it is mounted before express.json().
app.use("/api/sarvam", sarvamProxy_1.sarvamProxyRouter);
// Voice turns carry base64 audio, so they get their own larger JSON limit.
app.use("/api/voice/turn", voiceTurn_1.voiceTurnRouter);
app.use(express_1.default.json({ limit: "256kb" }));
app.use("/api/voice-tools", voiceTools_1.voiceToolsRouter);
app.use("/api/voice", voiceConfig_1.voiceConfigRouter);
app.use("/api", ops_1.opsRouter);
app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
});
// In production the backend also serves the built frontend (single-service deploy).
const frontendDist = node_path_1.default.resolve(__dirname, "../../frontend/dist");
if (node_fs_1.default.existsSync(frontendDist)) {
    app.use(express_1.default.static(frontendDist, { index: "index.html", maxAge: env_1.isProduction ? "1h" : 0 }));
    app.use((req, res, next) => {
        if (req.method !== "GET" || req.path.startsWith("/api"))
            return next();
        res.sendFile(node_path_1.default.join(frontendDist, "index.html"));
    });
}
app.listen(env_1.env.port, () => {
    const missing = (0, env_1.missingSarvamVars)();
    console.log(`UAV-GPT backend listening on http://localhost:${env_1.env.port} (${env_1.env.nodeEnv})`);
    console.log(`  simulated data: 8 drones, 15 deliveries, 3 incidents`);
    console.log(`  live voice: ${missing.length === 0 ? "configured" : `NOT configured — missing ${missing.join(", ")}`}`);
    console.log(`  speech voice (sk_ key): ${env_1.env.sarvamApiKey ? "available at /api/voice/turn" : "NOT configured — set SARVAM_API_KEY"}`);
    console.log(`  voice tools: ${env_1.env.toolSharedSecret ? "protected by SARVAM_TOOL_SHARED_SECRET" : "DISABLED — set SARVAM_TOOL_SHARED_SECRET"}`);
    console.log(`  frontend: ${node_fs_1.default.existsSync(frontendDist) ? "serving frontend/dist" : "not built (use the Vite dev server on :5173)"}`);
});
//# sourceMappingURL=server.js.map