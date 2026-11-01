"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProduction = exports.env = void 0;
exports.missingSarvamVars = missingSarvamVars;
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load repo-root .env first (shared with the workshop scripts), then backend/.env if present.
// Real deployments set these through the hosting platform instead.
dotenv_1.default.config({ path: node_path_1.default.resolve(__dirname, "../../../.env") });
dotenv_1.default.config({ path: node_path_1.default.resolve(__dirname, "../../.env") });
const read = (key) => (process.env[key] ?? "").trim();
const nodeEnv = process.env.NODE_ENV ?? "development";
exports.env = {
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
function missingSarvamVars() {
    const required = [
        ["SARVAM_API_KEY", exports.env.sarvamApiKey],
        ["SARVAM_ORG_ID", exports.env.sarvamOrgId],
        ["SARVAM_WORKSPACE_ID", exports.env.sarvamWorkspaceId],
        ["SARVAM_APP_ID", exports.env.sarvamAppId],
    ];
    return required.filter(([, v]) => !v).map(([k]) => k);
}
exports.isProduction = exports.env.nodeEnv === "production";
//# sourceMappingURL=env.js.map