"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.sarvamProxyRouter = void 0;
const express_1 = __importStar(require("express"));
const env_1 = require("../config/env");
/**
 * Backend proxy for the Sarvam Voice Agents Web SDK.
 *
 * The browser SDK is created with `baseUrl: "/api/sarvam/"` and `apiKey: ""`. Its only HTTP call
 * (sarvam-conv-ai-sdk/dist/modules/socket-manager.js, getSignedUrl) is:
 *
 *   GET {baseUrl}orgs/{org_id}/workspaces/{workspace_id}/apps/{app_id}/url
 *       ?interaction_type=call[&version=N]
 *   headers: X-API-Key: <key>
 *   -> 200 { "url": "<signed wss url>", "reference_id": "..." }
 *
 * The signed WebSocket URL is then opened directly against Sarvam (not through this proxy),
 * so the API key only ever needs to be attached here, on the server.
 *
 * Only paths under the configured org/workspace/app are forwarded, with a fresh header set
 * (browser cookies / auth headers are never passed upstream).
 */
exports.sarvamProxyRouter = (0, express_1.Router)();
const UPSTREAM_TIMEOUT_MS = 15_000;
exports.sarvamProxyRouter.use(express_1.default.raw({ type: () => true, limit: "1mb" }));
exports.sarvamProxyRouter.use(async (req, res) => {
    if (!env_1.env.sarvamApiKey || !env_1.env.sarvamOrgId || !env_1.env.sarvamWorkspaceId || !env_1.env.sarvamAppId) {
        res.status(503).json({ error: "Sarvam voice is not configured on the server (see /api/voice/config)." });
        return;
    }
    const allowedPrefix = `/orgs/${env_1.env.sarvamOrgId}/workspaces/${env_1.env.sarvamWorkspaceId}/apps/${env_1.env.sarvamAppId}/`;
    const pathOnly = req.url.split("?")[0];
    if (!pathOnly.startsWith(allowedPrefix)) {
        res.status(403).json({ error: "Proxy only forwards requests for the configured Sarvam agent." });
        return;
    }
    const upstreamUrl = new URL(req.url.replace(/^\/+/, ""), env_1.env.sarvamAppRuntimeUrl);
    const headers = { "X-API-Key": env_1.env.sarvamApiKey, Accept: req.header("accept") ?? "application/json" };
    const contentType = req.header("content-type");
    if (contentType)
        headers["Content-Type"] = contentType;
    const hasBody = !["GET", "HEAD"].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length > 0;
    try {
        const upstream = await fetch(upstreamUrl, {
            method: req.method,
            headers,
            body: hasBody ? new Uint8Array(req.body) : undefined,
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
        });
        const body = Buffer.from(await upstream.arrayBuffer());
        res.status(upstream.status);
        const upstreamType = upstream.headers.get("content-type");
        if (upstreamType)
            res.setHeader("Content-Type", upstreamType);
        const retryAfter = upstream.headers.get("x-retry-after");
        if (retryAfter)
            res.setHeader("x-retry-after", retryAfter);
        res.send(body);
        if (!upstream.ok) {
            // Log status + path only; never the key or the signed URL.
            console.warn(`[sarvam-proxy] ${req.method} ${pathOnly} -> ${upstream.status}`);
        }
    }
    catch (err) {
        const timedOut = err instanceof Error && err.name === "TimeoutError";
        console.warn(`[sarvam-proxy] ${req.method} ${pathOnly} failed: ${timedOut ? "timeout" : "upstream unreachable"}`);
        res.status(timedOut ? 504 : 502).json({ error: timedOut ? "Sarvam did not respond in time." : "Could not reach Sarvam." });
    }
});
//# sourceMappingURL=sarvamProxy.js.map