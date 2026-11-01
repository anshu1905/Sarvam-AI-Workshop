import path from "node:path";
import dotenv from "dotenv";

// Load repo-root .env first (shared with the workshop scripts), then backend/.env if present.
// Real deployments set these through the hosting platform instead.
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const read = (key: string): string => (process.env[key] ?? "").trim();

const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  // Production: the hosting platform's PORT. Development: fixed 3001 (what the Vite proxy targets)
  // unless BACKEND_PORT is set — dev launchers sometimes inject PORT for the frontend.
  port: nodeEnv === "production" ? Number(process.env.PORT) || 3001 : Number(process.env.BACKEND_PORT) || 3001,
  nodeEnv,
  sarvamApiKey: read("SARVAM_API_KEY"),
  // Upstream the Web SDK talks to (its own default). Override only if Sarvam tells you to.
  sarvamAppRuntimeUrl: read("SARVAM_APP_RUNTIME_URL") || "https://apps.sarvam.ai/api/app-runtime/",
  sarvamOrgId: read("SARVAM_ORG_ID"),
  sarvamWorkspaceId: read("SARVAM_WORKSPACE_ID"),
  sarvamAppId: read("SARVAM_APP_ID"),
  sarvamAgentVersion: read("SARVAM_AGENT_VERSION"),
  toolSharedSecret: read("SARVAM_TOOL_SHARED_SECRET"),
};

/** Names of the Sarvam voice variables that are not set. Empty when live voice is fully configured. */
export function missingSarvamVars(): string[] {
  const required: Array<[string, string]> = [
    ["SARVAM_API_KEY", env.sarvamApiKey],
    ["SARVAM_ORG_ID", env.sarvamOrgId],
    ["SARVAM_WORKSPACE_ID", env.sarvamWorkspaceId],
    ["SARVAM_APP_ID", env.sarvamAppId],
  ];
  return required.filter(([, v]) => !v).map(([k]) => k);
}

export const isProduction = env.nodeEnv === "production";
