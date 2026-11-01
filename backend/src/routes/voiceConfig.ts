import { Router } from "express";
import { env, missingSarvamVars } from "../config/env";

// Non-secret agent configuration for the browser SDK. The API key never leaves the server.
export const voiceConfigRouter = Router();

voiceConfigRouter.get("/config", (_req, res) => {
  const missing = missingSarvamVars();
  res.json({
    configured: missing.length === 0,
    missing,
    org_id: env.sarvamOrgId || null,
    workspace_id: env.sarvamWorkspaceId || null,
    app_id: env.sarvamAppId || null,
    agent_version: env.sarvamAgentVersion || null,
    tools_configured: Boolean(env.toolSharedSecret),
  });
});
