import express, { Router } from "express";
import { env } from "../config/env";

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
export const sarvamProxyRouter = Router();

const UPSTREAM_TIMEOUT_MS = 15_000;

sarvamProxyRouter.use(express.raw({ type: () => true, limit: "1mb" }));

sarvamProxyRouter.use(async (req, res) => {
  if (!env.sarvamApiKey || !env.sarvamOrgId || !env.sarvamWorkspaceId || !env.sarvamAppId) {
    res.status(503).json({ error: "Sarvam voice is not configured on the server (see /api/voice/config)." });
    return;
  }

  const allowedPrefix = `/orgs/${env.sarvamOrgId}/workspaces/${env.sarvamWorkspaceId}/apps/${env.sarvamAppId}/`;
  const pathOnly = req.url.split("?")[0];
  if (!pathOnly.startsWith(allowedPrefix)) {
    res.status(403).json({ error: "Proxy only forwards requests for the configured Sarvam agent." });
    return;
  }

  const upstreamUrl = new URL(req.url.replace(/^\/+/, ""), env.sarvamAppRuntimeUrl);

  const headers: Record<string, string> = { "X-API-Key": env.sarvamApiKey, Accept: req.header("accept") ?? "application/json" };
  const contentType = req.header("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const hasBody = !["GET", "HEAD"].includes(req.method) && Buffer.isBuffer(req.body) && req.body.length > 0;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: hasBody ? new Uint8Array(req.body as Buffer) : undefined,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    const body = Buffer.from(await upstream.arrayBuffer());
    res.status(upstream.status);
    const upstreamType = upstream.headers.get("content-type");
    if (upstreamType) res.setHeader("Content-Type", upstreamType);
    const retryAfter = upstream.headers.get("x-retry-after");
    if (retryAfter) res.setHeader("x-retry-after", retryAfter);
    res.send(body);

    if (!upstream.ok) {
      // Log status + path only; never the key or the signed URL.
      console.warn(`[sarvam-proxy] ${req.method} ${pathOnly} -> ${upstream.status}`);
    }
  } catch (err) {
    const timedOut = err instanceof Error && err.name === "TimeoutError";
    console.warn(`[sarvam-proxy] ${req.method} ${pathOnly} failed: ${timedOut ? "timeout" : "upstream unreachable"}`);
    res.status(timedOut ? 504 : 502).json({ error: timedOut ? "Sarvam did not respond in time." : "Could not reach Sarvam." });
  }
});
