import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Bearer-token guard for the voice-tool routes that Sarvam's cloud calls.
 * With no SARVAM_TOOL_SHARED_SECRET configured the routes are closed (503), never open.
 */
export function requireToolSecret(req: Request, res: Response, next: NextFunction): void {
  if (!env.toolSharedSecret) {
    res.status(503).json({ error: "Voice tools are not configured: set SARVAM_TOOL_SHARED_SECRET." });
    return;
  }
  const header = req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token || !safeEqual(token, env.toolSharedSecret)) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
