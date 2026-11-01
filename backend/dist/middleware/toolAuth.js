"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireToolSecret = requireToolSecret;
const node_crypto_1 = require("node:crypto");
const env_1 = require("../config/env");
function safeEqual(a, b) {
    const ab = Buffer.from(a);
    const bb = Buffer.from(b);
    return ab.length === bb.length && (0, node_crypto_1.timingSafeEqual)(ab, bb);
}
/**
 * Bearer-token guard for the voice-tool routes that Sarvam's cloud calls.
 * With no SARVAM_TOOL_SHARED_SECRET configured the routes are closed (503), never open.
 */
function requireToolSecret(req, res, next) {
    if (!env_1.env.toolSharedSecret) {
        res.status(503).json({ error: "Voice tools are not configured: set SARVAM_TOOL_SHARED_SECRET." });
        return;
    }
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token || !safeEqual(token, env_1.env.toolSharedSecret)) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    next();
}
//# sourceMappingURL=toolAuth.js.map