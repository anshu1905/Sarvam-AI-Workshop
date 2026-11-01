import { useCallback, useEffect, useRef, useState } from "react";
import { AgentState } from "sarvam-conv-ai-sdk/browser";
import type { VoiceConfig } from "../types";
import type { TranscriptEntry, VoiceLanguage, VoiceStatus } from "./useSarvamAgent";

/**
 * Hands-free voice loop on Sarvam's Model APIs (works with the plain `sk_` key):
 * record until the operator pauses -> POST /api/voice/turn (STT -> chat + tools -> TTS) -> play reply -> listen again.
 * Same return shape as useSarvamAgent so the voice panel can use either.
 */

// ponytail: energy-threshold VAD with no barge-in while the reply plays; raise SPEECH_RMS for noisy rooms.
const SPEECH_RMS = 0.02;
const SILENCE_MS = 1100;
const MIN_SPEECH_MS = 300;
const MAX_TURN_MS = 25_000; // Sarvam's REST speech-to-text takes up to 30 s of audio
const IDLE_RESTART_MS = 15_000; // drop long stretches of silence before anyone speaks

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

function micError(err: unknown): string {
  if (err instanceof DOMException && err.name === "NotAllowedError") return "Microphone access was denied. Allow the microphone for this site and try again.";
  if (err instanceof DOMException && err.name === "NotFoundError") return "No microphone was found on this device.";
  if (err instanceof DOMException && err.name === "NotReadableError") return "The microphone is in use by another application.";
  return err instanceof Error ? err.message : "Unknown error";
}

export function useSarvamSpeech(config: VoiceConfig | null, onDataChanged?: () => void) {
  const [rawStatus, setStatus] = useState<VoiceStatus>("idle");
  const [agentState, setAgentState] = useState<AgentState>(AgentState.IDLE);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [levels, setLevels] = useState({ input: 0, output: 0 });

  const activeRef = useRef(false);
  const mutedRef = useRef(false);
  const languageRef = useRef<VoiceLanguage | "auto">("auto");
  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const rafRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;
  const onDataChangedRef = useRef(onDataChanged);
  onDataChangedRef.current = onDataChanged;

  const append = useCallback((role: TranscriptEntry["role"], text: string) => {
    setTranscript((prev) => [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, text, at: Date.now() }]);
  }, []);

  const teardown = useCallback(() => {
    activeRef.current = false;
    cancelAnimationFrame(rafRef.current);
    const rec = recorderRef.current;
    recorderRef.current = null;
    if (rec && rec.state !== "inactive") rec.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    void ctxRef.current?.close();
    ctxRef.current = null;
    audioRef.current?.pause();
    audioRef.current = null;
    mutedRef.current = false;
    setMuted(false);
    setUserSpeaking(false);
    setLevels({ input: 0, output: 0 });
    setAgentState(AgentState.IDLE);
  }, []);

  const sendTurn = useCallback(async (blob: Blob) => {
    setAgentState(AgentState.CONNECTED); // "thinking"
    const history = transcriptRef.current.map((t) => ({ role: t.role, content: t.text }));
    const res = await fetch("/api/voice/turn", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audio_base64: await blobToBase64(blob),
        mime: blob.type,
        language: languageRef.current === "auto" ? undefined : languageRef.current,
        history,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error ?? `${res.status} ${res.statusText}`);
    if (!body.transcript) return; // nothing intelligible was said
    append("user", body.transcript);
    append("assistant", body.reply);
    if (body.data_changed) onDataChangedRef.current?.();
    if (body.audio_base64 && activeRef.current) {
      setAgentState(AgentState.SPEAKING);
      const audio = new Audio(`data:${body.audio_mime ?? "audio/wav"};base64,${body.audio_base64}`);
      audioRef.current = audio;
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.onpause = () => resolve();
        audio.play().catch(() => resolve());
      });
    }
  }, [append]);

  // One recording cycle: start recording, watch mic energy, stop after a pause, send, then loop.
  const listen = useCallback(() => {
    const stream = streamRef.current;
    const ctx = ctxRef.current;
    if (!activeRef.current || !stream || !ctx) return;
    setAgentState(AgentState.LISTENING);

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const samples = new Float32Array(analyser.fftSize);

    const recorder = new MediaRecorder(stream);
    recorderRef.current = recorder;
    const chunks: Blob[] = [];
    let send = false;
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    recorder.onstop = async () => {
      analyser.disconnect();
      if (!activeRef.current) return;
      if (send) {
        try {
          await sendTurn(new Blob(chunks, { type: recorder.mimeType }));
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Voice turn failed.");
        }
      }
      listen();
    };
    recorder.start();

    const startedAt = performance.now();
    let speechStart = 0;
    let lastLoud = 0;
    let lastLevelAt = 0;
    const tick = () => {
      if (recorderRef.current !== recorder || recorder.state !== "recording") return;
      const now = performance.now();
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (const s of samples) sum += s * s;
      const rms = mutedRef.current ? 0 : Math.sqrt(sum / samples.length);
      if (now - lastLevelAt > 80) { lastLevelAt = now; setLevels({ input: rms, output: 0 }); }

      if (rms > SPEECH_RMS) {
        if (!speechStart) { speechStart = now; setUserSpeaking(true); }
        lastLoud = now;
      }
      const paused = speechStart && now - lastLoud > SILENCE_MS;
      const tooLong = speechStart && now - speechStart > MAX_TURN_MS;
      if (paused || tooLong) {
        setUserSpeaking(false);
        send = lastLoud - speechStart >= MIN_SPEECH_MS;
        recorder.stop(); // a blip shorter than MIN_SPEECH_MS is discarded and listening restarts
        return;
      }
      if (!speechStart && now - startedAt > IDLE_RESTART_MS) { recorder.stop(); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [sendTurn]);

  const start = useCallback(async (language: VoiceLanguage | "auto" = "auto") => {
    if (!config?.speech_configured) {
      setError("SARVAM_API_KEY is not set on the backend.");
      return;
    }
    if (activeRef.current) return;
    languageRef.current = language;
    setError(null);
    setStatus("connecting");
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch (err) {
      setStatus("error");
      setError(micError(err));
      return;
    }
    ctxRef.current = new AudioContext();
    activeRef.current = true;
    setStatus("live");
    listen();
  }, [config, listen]);

  const stop = useCallback(async () => {
    teardown();
    setStatus("idle");
  }, [teardown]);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
  }, []);

  const clearTranscript = useCallback(() => setTranscript([]), []);

  useEffect(() => teardown, [teardown]);

  const status: VoiceStatus = rawStatus === "idle" && !config?.speech_configured ? "unconfigured" : rawStatus;
  return { config, status, agentState, transcript, error, muted, userSpeaking, levels, interactionId: null as string | null, start, stop, toggleMute, clearTranscript };
}
