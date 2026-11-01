import { useEffect, useRef, useState } from "react";
import { AudioLines, Bot, Mic, MicOff, PhoneOff, Radar, Settings2, Square, Trash2, X } from "lucide-react";
import { AgentState } from "sarvam-conv-ai-sdk/browser";
import { useSarvamAgent, VOICE_LANGUAGES, type VoiceLanguage, type VoiceStatus } from "../../hooks/useSarvamAgent";
import { useSarvamSpeech } from "../../hooks/useSarvamSpeech";

const SUGGESTED_COMMANDS = [
  "Show me the fleet summary.",
  "Which drones have low battery?",
  "Are any drones outside their flight corridors?",
  "Where is order ORD-1042?",
  "Show me all open safety incidents.",
  "Give me the details of drone D-07.",
];

const statusMeta: Record<VoiceStatus, { label: string; dot: string }> = {
  unconfigured: { label: "Not configured", dot: "bg-slate-500" },
  idle: { label: "Ready", dot: "bg-slate-400" },
  connecting: { label: "Connecting", dot: "bg-amber-400 level-pulse" },
  live: { label: "Live", dot: "bg-emerald-400" },
  disconnected: { label: "Disconnected", dot: "bg-amber-400" },
  error: { label: "Error", dot: "bg-rose-400" },
};

export function UAVGPTVoiceAgent({ onDataChanged }: { onDataChanged?: () => void }) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState<VoiceLanguage | "auto">("auto");
  const agent = useSarvamAgent(onDataChanged);
  const speech = useSarvamSpeech(agent.config, onDataChanged);
  // Voice Agents needs its own key + agent ids; without them, fall back to STT -> chat -> TTS on the sk_ key.
  const speechMode = !agent.config?.configured && Boolean(agent.config?.speech_configured);
  const voice = speechMode ? speech : agent;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [voice.transcript]);

  const live = voice.status === "live";
  const busy = voice.status === "connecting";
  const listening = live && voice.agentState === AgentState.LISTENING;
  const speaking = live && voice.agentState === AgentState.SPEAKING;
  const meta = statusMeta[voice.status];
  const ring = Math.min(1, (speaking ? voice.levels.output : voice.levels.input) * 4);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full border border-sky-500/40 bg-navy-800 py-2.5 pl-3 pr-4 text-sm font-medium text-slate-100 shadow-xl shadow-black/40 transition-colors hover:bg-navy-700"
      >
        <span className={`flex h-8 w-8 items-center justify-center rounded-full ${live ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/15 text-sky-300"}`}>
          {live ? <AudioLines size={16} /> : <Mic size={16} />}
        </span>
        UAV-GPT assistant
        {live && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
      </button>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-40 flex max-h-[calc(100vh-5.5rem)] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-line bg-navy-900 shadow-2xl shadow-black/50">
      <header className="flex items-center gap-3 border-b border-line px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-300"><Radar size={16} /></div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">UAV-GPT voice assistant</div>
          <div className="text-[11px] text-slate-400">{speechMode ? "Sarvam speech APIs" : "Sarvam Voice Agents"} · decision support only</div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded border border-line bg-navy-800 px-2 py-0.5 text-[11px] font-medium text-slate-300">
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}
          </span>
          <button type="button" onClick={() => setOpen(false)} className="rounded p-1 text-slate-400 hover:bg-navy-700 hover:text-white" aria-label="Minimise"><X size={16} /></button>
        </div>
      </header>

      {voice.status === "unconfigured" && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">
          <div className="font-semibold">Live voice is not configured</div>
          <div className="mt-0.5 text-amber-200/80">
            {voice.config ? `Set ${voice.config.missing.join(", ")} on the backend and restart it. ` : "The backend did not return a voice configuration. "}
            The dashboard works without it; only the voice assistant is disabled.
          </div>
        </div>
      )}
      {voice.config && voice.config.configured && !voice.config.tools_configured && (
        <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-[11px] text-amber-200">
          SARVAM_TOOL_SHARED_SECRET is not set: the agent can talk, but its API tools cannot read fleet data.
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2">
        <label className="flex items-center gap-2 text-[11px] text-slate-400">
          <Settings2 size={12} /> Language
          <select
            value={language}
            disabled={live || busy}
            onChange={(e) => setLanguage(e.target.value as VoiceLanguage | "auto")}
            className="rounded border border-line bg-navy-800 px-1.5 py-0.5 text-xs text-slate-200 disabled:opacity-50"
          >
            <option value="auto">Agent default</option>
            {VOICE_LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </label>
        <span className="text-[11px] text-slate-500">{speechMode ? "Agent default = auto-detect" : "Must be enabled on the Sarvam agent"}</span>
      </div>

      <div className="flex flex-col items-center gap-3 border-b border-line px-4 py-4">
        <button
          type="button"
          onClick={() => (live ? void voice.stop() : void voice.start(language))}
          disabled={busy || voice.status === "unconfigured"}
          aria-label={live ? "Stop conversation" : "Start conversation"}
          className={`relative flex h-20 w-20 items-center justify-center rounded-full border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            live ? (voice.muted ? "border-amber-400 bg-amber-500/10 text-amber-300" : "border-emerald-400 bg-emerald-500/10 text-emerald-300") : "border-sky-400 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20"
          }`}
        >
          {live && <span className="absolute inset-0 rounded-full border-2 border-current opacity-40" style={{ transform: `scale(${1 + ring * 0.35})`, transition: "transform 80ms linear" }} />}
          {busy ? <AudioLines size={28} className="level-pulse" /> : live ? (voice.muted ? <MicOff size={28} /> : <Mic size={28} />) : <Mic size={28} />}
        </button>
        <div className="h-5 text-xs font-medium">
          {busy && <span className="text-amber-300">{speechMode ? "Opening microphone…" : "Connecting to Sarvam…"}</span>}
          {listening && !voice.muted && <span className="flex items-center gap-1.5 text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 level-pulse" />{voice.userSpeaking ? "Hearing you" : "Listening"}</span>}
          {listening && voice.muted && <span className="text-amber-300">Muted — agent hears silence</span>}
          {speaking && <span className="flex items-center gap-1.5 text-sky-300"><AudioLines size={14} />UAV-GPT is speaking</span>}
          {live && voice.agentState === AgentState.CONNECTED && <span className="text-slate-300">{speechMode ? "Thinking…" : "Connected"}</span>}
          {voice.status === "idle" && <span className="text-slate-400">Click to start — microphone activates only on click</span>}
          {voice.status === "disconnected" && <span className="text-amber-300">Session ended. Start again for a new session.</span>}
        </div>
        <div className="flex items-center gap-2">
          {!live ? (
            <button type="button" onClick={() => void voice.start(language)} disabled={busy || voice.status === "unconfigured"} className="flex items-center gap-1.5 rounded-md border border-sky-500/40 bg-sky-500/10 px-3 py-1.5 text-xs font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-50">
              <Mic size={14} /> Start conversation
            </button>
          ) : (
            <>
              <button type="button" onClick={voice.toggleMute} className="flex items-center gap-1.5 rounded-md border border-line bg-navy-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-navy-700">
                {voice.muted ? <><Mic size={14} /> Unmute</> : <><MicOff size={14} /> Mute</>}
              </button>
              <button type="button" onClick={() => void voice.stop()} className="flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/20">
                <PhoneOff size={14} /> Stop conversation
              </button>
            </>
          )}
          {busy && (
            <button type="button" onClick={() => void voice.stop()} className="flex items-center gap-1.5 rounded-md border border-line bg-navy-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-navy-700">
              <Square size={12} /> Cancel
            </button>
          )}
        </div>
        {voice.error && <div className="w-full rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">{voice.error}</div>}
      </div>

      <div ref={listRef} className="min-h-[9rem] flex-1 space-y-2 overflow-y-auto px-4 py-3">
        {voice.transcript.length === 0 ? (
          <div>
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Try saying</div>
            <ul className="space-y-1">
              {SUGGESTED_COMMANDS.map((c) => (
                <li key={c} className="rounded border border-line bg-navy-800 px-2.5 py-1.5 text-xs text-slate-300">“{c}”</li>
              ))}
            </ul>
            <p className="mt-3 text-[11px] text-slate-500">Acknowledging an incident by voice always asks you to confirm first.</p>
          </div>
        ) : (
          voice.transcript.map((t) => (
            <div key={t.id} className={`flex gap-2 ${t.role === "user" ? "justify-end" : "justify-start"}`}>
              {t.role === "assistant" && <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-300"><Bot size={13} /></span>}
              <div className={`max-w-[85%] rounded-md px-3 py-2 text-sm leading-relaxed ${t.role === "user" ? "bg-navy-600 text-white" : "border border-line bg-navy-800 text-slate-200"} ${t.streaming ? "opacity-80" : ""}`}>
                {t.text}
              </div>
            </div>
          ))
        )}
      </div>

      <footer className="flex items-center justify-between border-t border-line px-4 py-2 text-[11px] text-slate-500">
        <span>{voice.interactionId ? `Session ${voice.interactionId.slice(0, 8)}…` : "API key stays on the server"}</span>
        {voice.transcript.length > 0 && (
          <button type="button" onClick={voice.clearTranscript} className="flex items-center gap-1 text-slate-400 hover:text-slate-200"><Trash2 size={12} /> Clear</button>
        )}
      </footer>
    </aside>
  );
}
