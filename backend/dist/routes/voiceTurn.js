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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceTurnRouter = void 0;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const express_1 = __importStar(require("express"));
const env_1 = require("../config/env");
const opsService_1 = require("../services/opsService");
const voiceTools_1 = require("./voiceTools");
/**
 * One voice turn on Sarvam's Model APIs, which accept the regular `sk_` subscription key
 * (the Voice Agents runtime does not):
 *
 *   speech-to-text (saaras) -> chat completion with the five UAV-GPT tools -> text-to-speech (bulbul)
 *
 * POST /api/voice/turn  { audio_base64?, mime?, text?, language?, history? }
 *   -> { transcript, language_code, reply, audio_base64, audio_mime, data_changed }
 *
 * Tools run in-process against opsService, so SARVAM_TOOL_SHARED_SECRET is not needed here.
 */
exports.voiceTurnRouter = (0, express_1.Router)();
exports.voiceTurnRouter.use(express_1.default.json({ limit: "8mb" }));
const SARVAM_BASE = "https://api.sarvam.ai/";
const CHAT_MODEL = "sarvam-105b-conversations";
const TIMEOUT_MS = 30_000;
const MAX_TOOL_ROUNDS = 4;
const MAX_HISTORY = 12;
const LANGUAGE_CODES = {
    English: "en-IN", Hindi: "hi-IN", Marathi: "mr-IN", Tamil: "ta-IN", Telugu: "te-IN", Kannada: "kn-IN",
    Malayalam: "ml-IN", Bengali: "bn-IN", Gujarati: "gu-IN", Punjabi: "pa-IN", Odia: "od-IN",
};
const TTS_LANGUAGES = new Set(Object.values(LANGUAGE_CODES));
// Same instructions as the Sarvam dashboard agent: everything below the first "---" in the prompt doc.
const SYSTEM_PROMPT = (() => {
    try {
        const doc = node_fs_1.default.readFileSync(node_path_1.default.resolve(__dirname, "../../../docs/SARVAM_AGENT_PROMPT.md"), "utf8");
        return doc.split(/\n---\n/).slice(1).join("\n---\n").trim() + "\n\nYour reply is spoken aloud: plain sentences only, no markdown, lists or emoji.";
    }
    catch {
        return "You are UAV-GPT, a voice copilot for drone delivery operations. Use the tools; never invent telemetry. Acknowledge incidents only after explicit confirmation. Reply briefly in plain spoken sentences, in the operator's language.";
    }
})();
const tool = (name, description, props = {}, required = []) => ({
    type: "function",
    function: {
        name,
        description,
        parameters: {
            type: "object",
            properties: Object.fromEntries(Object.entries(props).map(([k, d]) => [k, { type: "string", description: d }])),
            required,
        },
    },
});
const TOOLS = [
    tool("get_ops_summary", "Fleet-wide summary: counts, fleet health, low-battery and outside-corridor drone ids, open alerts."),
    tool("get_drone_status", "Live telemetry for one drone.", { drone_id: "Drone id, e.g. D-07" }, ["drone_id"]),
    tool("get_delivery_status", "Status of one delivery order.", { order_id: "Order id, e.g. ORD-1042" }, ["order_id"]),
    tool("get_open_alerts", "Safety incidents / alerts.", { status: "open (default), acknowledged or all" }),
    tool("acknowledge_alert", "Acknowledge an incident. Only after the operator explicitly confirmed.", { alert_id: "Incident id, e.g. INC-001" }, ["alert_id"]),
];
function runTool(name, args) {
    const arg = (k) => String(args[k] ?? "").trim();
    switch (name) {
        case "get_ops_summary":
            return (0, voiceTools_1.opsSummaryForVoice)();
        case "get_drone_status": {
            const d = opsService_1.opsService.getDrone(arg("drone_id"));
            return d ? { simulated: true, ...(0, voiceTools_1.droneForVoice)(d) } : { error: `No drone with id ${arg("drone_id")}`, known_drone_ids: opsService_1.opsService.listDrones().map((x) => x.drone_id) };
        }
        case "get_delivery_status": {
            const o = opsService_1.opsService.getDelivery(arg("order_id"));
            return o ? { simulated: true, ...(0, voiceTools_1.deliveryForVoice)(o) } : { error: `No delivery with order id ${arg("order_id")}` };
        }
        case "get_open_alerts": {
            const status = arg("status") === "acknowledged" || arg("status") === "all" ? arg("status") : "open";
            const alerts = opsService_1.opsService.listAlerts(status);
            return { simulated: true, status, count: alerts.length, alerts: alerts.map(voiceTools_1.alertForVoice) };
        }
        case "acknowledge_alert": {
            const a = opsService_1.opsService.acknowledgeAlert(arg("alert_id"), "Operations Manager (via UAV-GPT voice)");
            return a ? { simulated: true, result: "acknowledged", ...(0, voiceTools_1.alertForVoice)(a) } : { error: `No alert with id ${arg("alert_id")}` };
        }
        default:
            return { error: `Unknown tool ${name}` };
    }
}
class SarvamError extends Error {
    status;
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}
async function sarvam(pathname, init) {
    const res = await fetch(SARVAM_BASE + pathname, {
        ...init,
        headers: { "api-subscription-key": env_1.env.sarvamApiKey, ...init.headers },
        signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
        const detail = body?.error?.message ?? body?.message ?? res.statusText;
        console.warn(`[voice-turn] ${pathname} -> ${res.status}: ${detail}`);
        throw new SarvamError(res.status, res.status === 401 || res.status === 403 ? "Sarvam rejected SARVAM_API_KEY." : `Sarvam ${pathname} failed: ${detail}`);
    }
    return body;
}
const json = { "Content-Type": "application/json" };
const spoken = (text) => String(text ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").replace(/[*#`_]/g, "").trim();
async function transcribe(audioBase64, mime, languageCode) {
    const type = mime.split(";")[0] || "audio/webm";
    const form = new FormData();
    form.append("file", new Blob([Buffer.from(audioBase64, "base64")], { type }), `turn.${type.split("/")[1] ?? "webm"}`);
    form.append("model", "saaras:v3");
    form.append("mode", "transcribe");
    if (languageCode)
        form.append("language_code", languageCode);
    const r = await sarvam("speech-to-text", { method: "POST", body: form });
    return { transcript: String(r.transcript ?? "").trim(), languageCode: r.language_code ?? languageCode };
}
async function chat(history, userText) {
    const messages = [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: userText }];
    let dataChanged = false;
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const r = await sarvam("v1/chat/completions", { method: "POST", headers: json, body: JSON.stringify({ model: CHAT_MODEL, messages, tools: TOOLS, temperature: 0.2 }) });
        const msg = r.choices?.[0]?.message;
        if (!msg?.tool_calls?.length)
            return { reply: spoken(msg?.content) || "Sorry, I didn't catch that.", dataChanged };
        messages.push(msg);
        for (const call of msg.tool_calls) {
            let args = {};
            try {
                args = JSON.parse(call.function?.arguments || "{}");
            }
            catch { /* model sent bad JSON; tool reports missing args */ }
            if (call.function?.name === "acknowledge_alert")
                dataChanged = true;
            messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(runTool(call.function?.name, args)) });
        }
    }
    return { reply: "Sorry, that lookup took too many steps. Please check the dashboard.", dataChanged };
}
exports.voiceTurnRouter.post("/", async (req, res) => {
    if (!env_1.env.sarvamApiKey) {
        res.status(503).json({ error: "SARVAM_API_KEY is not set on the server." });
        return;
    }
    const body = req.body ?? {};
    const selected = LANGUAGE_CODES[String(body.language ?? "")];
    const history = (Array.isArray(body.history) ? body.history : [])
        .filter((m) => (m?.role === "user" || m?.role === "assistant") && typeof m.content === "string" && m.content.trim())
        .slice(-MAX_HISTORY)
        .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    try {
        let transcript = typeof body.text === "string" ? body.text.trim().slice(0, 2000) : "";
        let languageCode = selected;
        if (!transcript && typeof body.audio_base64 === "string" && body.audio_base64) {
            ({ transcript, languageCode } = await transcribe(body.audio_base64, String(body.mime ?? ""), selected));
        }
        if (!transcript) {
            res.json({ transcript: "", reply: "", audio_base64: null });
            return;
        }
        const { reply, dataChanged } = await chat(history, transcript);
        const ttsLanguage = languageCode && TTS_LANGUAGES.has(languageCode) ? languageCode : "en-IN";
        let audio = null;
        try {
            const tts = await sarvam("text-to-speech", { method: "POST", headers: json, body: JSON.stringify({ text: reply.slice(0, 2000), language_code: ttsLanguage, model: "bulbul:v3" }) });
            audio = tts.audios?.[0] ?? null;
        }
        catch {
            // Speech failed but the text reply is still useful; the UI shows it.
        }
        res.json({ transcript, language_code: ttsLanguage, reply, audio_base64: audio, audio_mime: "audio/wav", data_changed: dataChanged });
    }
    catch (err) {
        const status = err instanceof SarvamError ? 502 : err instanceof Error && err.name === "TimeoutError" ? 504 : 500;
        res.status(status).json({ error: err instanceof Error && status !== 500 ? (status === 504 ? "Sarvam did not respond in time." : err.message) : "Voice turn failed." });
    }
});
//# sourceMappingURL=voiceTurn.js.map