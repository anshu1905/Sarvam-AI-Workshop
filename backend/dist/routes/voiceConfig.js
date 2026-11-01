"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceConfigRouter = void 0;
const express_1 = require("express");
const env_1 = require("../config/env");
// Non-secret agent configuration for the browser SDK. The API key never leaves the server.
exports.voiceConfigRouter = (0, express_1.Router)();
exports.voiceConfigRouter.get("/config", (_req, res) => {
    const missing = (0, env_1.missingSarvamVars)();
    res.json({
        configured: missing.length === 0,
        missing,
        org_id: env_1.env.sarvamOrgId || null,
        workspace_id: env_1.env.sarvamWorkspaceId || null,
        app_id: env_1.env.sarvamAppId || null,
        agent_version: env_1.env.sarvamAgentVersion || null,
        tools_configured: Boolean(env_1.env.toolSharedSecret),
        // STT -> chat -> TTS fallback (/api/voice/turn) only needs the Model-API key.
        speech_configured: Boolean(env_1.env.sarvamApiKey),
    });
});
//# sourceMappingURL=voiceConfig.js.map