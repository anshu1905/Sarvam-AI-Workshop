import { useCallback, useEffect, useRef, useState } from "react";
import {
  AgentState,
  AuthenticationError,
  BrowserAudioInterface,
  ConversationAgent,
  ForbiddenError,
  InteractionType,
  NotFoundError,
  RateLimitError,
  type AudioLevel,
  type InteractionConfig,
  type ServerEventBase,
  type ServerTextChunkMsg,
  type ServerTextMsgType,
  type ServerTranscriptMsg,
} from "sarvam-conv-ai-sdk/browser";

// The language enum is not a runtime export of the /browser entry; its values are plain names ("Hindi").
type SarvamLanguageName = NonNullable<InteractionConfig["initial_language_name"]>;
import { api } from "../services/api";
import type { VoiceConfig } from "../types";

export type VoiceStatus = "unconfigured" | "idle" | "connecting" | "live" | "disconnected" | "error";

export interface TranscriptEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  streaming?: boolean;
}

/** Languages the Sarvam SDK can start a session in (must also be enabled on the agent). */
export const VOICE_LANGUAGES = ["English", "Hindi", "Marathi", "Tamil", "Telugu", "Kannada", "Malayalam", "Bengali", "Gujarati", "Punjabi", "Odia"] as const;
export type VoiceLanguage = (typeof VOICE_LANGUAGES)[number];

const CONNECT_TIMEOUT_S = 15;
const SESSION_ID = `uavgpt-demo-${Math.random().toString(36).slice(2, 10)}`;

function describeError(err: unknown): string {
  if (err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError")) {
    return "Microphone access was denied. Allow the microphone for this site and try again.";
  }
  if (err instanceof DOMException && err.name === "NotFoundError") return "No microphone was found on this device.";
  if (err instanceof DOMException && err.name === "NotReadableError") return "The microphone is in use by another application.";
  if (err instanceof AuthenticationError) return "Sarvam rejected the server's API key (check SARVAM_API_KEY).";
  if (err instanceof ForbiddenError) return "The Sarvam API key does not have access to this agent.";
  if (err instanceof NotFoundError) return "Agent not found — check SARVAM_ORG_ID, SARVAM_WORKSPACE_ID and SARVAM_APP_ID, and that the agent has a committed version.";
  if (err instanceof RateLimitError) return `Sarvam rate limit reached. Retry in ${err.retryAfter}s.`;
  if (err instanceof Error) return err.message;
  return "Unknown error";
}

export function useSarvamAgent(onDataChanged?: () => void) {
  const [config, setConfig] = useState<VoiceConfig | null>(null);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [agentState, setAgentState] = useState<AgentState>(AgentState.IDLE);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [levels, setLevels] = useState({ input: 0, output: 0 });
  const [interactionId, setInteractionId] = useState<string | null>(null);

  const agentRef = useRef<ConversationAgent | null>(null);
  const streamingIdRef = useRef<string | null>(null);
  const onDataChangedRef = useRef(onDataChanged);
  onDataChangedRef.current = onDataChanged;

  // Load non-secret agent configuration from the backend.
  useEffect(() => {
    let cancelled = false;
    api.voiceConfig()
      .then((c) => {
        if (cancelled) return;
        setConfig(c);
        setStatus(c.configured ? "idle" : "unconfigured");
      })
      .catch(() => {
        if (cancelled) return;
        setConfig(null);
        setStatus("unconfigured");
        setError("Could not load voice configuration from the backend.");
      });
    return () => { cancelled = true; };
  }, []);

  const appendTranscript = useCallback((role: TranscriptEntry["role"], text: string, streaming = false) => {
    const entry: TranscriptEntry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text, at: Date.now(), streaming };
    setTranscript((prev) => [...prev, entry]);
    return entry.id;
  }, []);

  const handleText = useCallback(async (msg: ServerTextChunkMsg | ServerTextMsgType) => {
    // Streaming assistant text; finalised when the bot transcript arrives.
    const chunk = msg.text ?? "";
    if (!chunk) return;
    if (streamingIdRef.current) {
      const id = streamingIdRef.current;
      setTranscript((prev) => prev.map((e) => (e.id === id ? { ...e, text: e.text + chunk } : e)));
    } else {
      streamingIdRef.current = appendTranscript("assistant", chunk, true);
    }
    if ("status" in msg && msg.status === "completed") {
      const id = streamingIdRef.current;
      streamingIdRef.current = null;
      setTranscript((prev) => prev.map((e) => (e.id === id ? { ...e, streaming: false } : e)));
    }
  }, [appendTranscript]);

  const handleTranscript = useCallback(async (msg: ServerTranscriptMsg) => {
    const text = msg.content?.trim();
    if (!text) return;
    if (msg.role === "user") {
      appendTranscript("user", text);
      return;
    }
    // Bot transcript: replace the streamed draft if one exists, otherwise add a new line.
    const streamingId = streamingIdRef.current;
    streamingIdRef.current = null;
    if (streamingId) {
      setTranscript((prev) => prev.map((e) => (e.id === streamingId ? { ...e, text, streaming: false } : e)));
    } else {
      appendTranscript("assistant", text);
    }
  }, [appendTranscript]);

  const handleEvent = useCallback(async (event: ServerEventBase) => {
    switch (event.type as string) {
      case "server.event.user_speech_start": setUserSpeaking(true); break;
      case "server.event.user_speech_end": setUserSpeaking(false); break;
      case "server.event.tool_call":
        // The agent called a backend tool (possibly acknowledge_alert) — refresh dashboard data shortly after.
        window.setTimeout(() => onDataChangedRef.current?.(), 800);
        window.setTimeout(() => onDataChangedRef.current?.(), 2500);
        break;
      case "server.action.interaction_connected":
        setInteractionId(agentRef.current?.getInteractionId() ?? null);
        break;
      case "server.action.interaction_end":
        setStatus("disconnected");
        break;
      default: break;
    }
  }, []);

  const lastLevelRef = useRef({ input: 0, output: 0, at: 0 });
  const handleLevel = useCallback((level: AudioLevel) => {
    const now = performance.now();
    if (now - lastLevelRef.current.at < 80) return; // throttle re-renders
    lastLevelRef.current = { ...lastLevelRef.current, at: now, [level.direction]: level.rms };
    setLevels({ input: lastLevelRef.current.input, output: lastLevelRef.current.output });
  }, []);

  const teardown = useCallback(async () => {
    const agent = agentRef.current;
    agentRef.current = null;
    streamingIdRef.current = null;
    setUserSpeaking(false);
    setLevels({ input: 0, output: 0 });
    setMuted(false);
    if (agent) {
      try { await agent.stop(); } catch { /* already closed */ }
    }
  }, []);

  const start = useCallback(async (language: VoiceLanguage | "auto" = "auto") => {
    if (!config?.configured) {
      setStatus("unconfigured");
      setError(`Live voice is not configured. Missing: ${config?.missing.join(", ") || "backend configuration"}.`);
      return;
    }
    if (agentRef.current) return;
    setError(null);
    setStatus("connecting");

    // Explicit microphone permission check so permission errors are reported clearly.
    try {
      const probe = await navigator.mediaDevices.getUserMedia({ audio: true });
      probe.getTracks().forEach((t) => t.stop());
    } catch (err) {
      setStatus("error");
      setError(describeError(err));
      return;
    }

    // A signed WebSocket URL is single-use, so every session gets a fresh agent instance.
    const version = config.agent_version && /^\d+$/.test(config.agent_version) ? Number(config.agent_version) : undefined;
    const agent = new ConversationAgent({
      apiKey: "", // injected by the backend proxy
      baseUrl: "/api/sarvam/",
      platform: "browser",
      config: {
        org_id: config.org_id!,
        workspace_id: config.workspace_id!,
        app_id: config.app_id!,
        ...(version !== undefined ? { version } : {}),
        user_identifier: SESSION_ID,
        user_identifier_type: "custom",
        interaction_type: InteractionType.CALL,
        input_sample_rate: 16000,
        output_sample_rate: 16000,
        ...(language !== "auto" ? { initial_language_name: language as unknown as SarvamLanguageName } : {}),
      },
      audioInterface: new BrowserAudioInterface(16000),
      stateCallback: (next) => {
        setAgentState(next);
        if (next === AgentState.ERROR) setStatus("error");
      },
      textCallback: handleText,
      transcriptCallback: handleTranscript,
      eventCallback: handleEvent,
      audioLevelCallback: handleLevel,
      startCallback: async () => { setStatus("live"); },
      endCallback: async () => {
        setStatus((s) => (s === "error" ? s : "disconnected"));
        agentRef.current = null;
      },
    });
    agentRef.current = agent;

    try {
      await agent.start();
      const connected = await agent.waitForConnect(CONNECT_TIMEOUT_S);
      if (!connected) {
        throw new Error(`Connection timed out after ${CONNECT_TIMEOUT_S}s. Check the backend proxy and your network.`);
      }
      setStatus("live");
      setInteractionId(agent.getInteractionId() ?? null);
    } catch (err) {
      setError(describeError(err));
      setStatus("error");
      await teardown();
    }
  }, [config, handleEvent, handleLevel, handleText, handleTranscript, teardown]);

  const stop = useCallback(async () => {
    await teardown();
    setStatus(config?.configured ? "idle" : "unconfigured");
  }, [config, teardown]);

  const toggleMute = useCallback(() => {
    const agent = agentRef.current;
    if (!agent) return;
    if (agent.isMuted()) { agent.unmute(); setMuted(false); } else { agent.mute(); setMuted(true); }
  }, []);

  const clearTranscript = useCallback(() => setTranscript([]), []);

  // Always release the microphone and socket on unmount.
  useEffect(() => () => { void teardown(); }, [teardown]);

  return { config, status, agentState, transcript, error, muted, userSpeaking, levels, interactionId, start, stop, toggleMute, clearTranscript };
}
