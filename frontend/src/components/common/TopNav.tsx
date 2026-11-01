import { useEffect, useState } from "react";
import { Activity, FlaskConical, Radar, UserRound } from "lucide-react";
import type { FleetHealth } from "../../types";

export type Page = "overview" | "fleet" | "deliveries" | "incidents";

const NAV: Array<{ id: Page; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "fleet", label: "Fleet" },
  { id: "deliveries", label: "Deliveries" },
  { id: "incidents", label: "Incidents" },
];

const healthStyle: Record<FleetHealth, { dot: string; text: string; label: string }> = {
  NOMINAL: { dot: "bg-emerald-400", text: "text-emerald-300", label: "Nominal" },
  MONITOR: { dot: "bg-amber-400", text: "text-amber-300", label: "Monitor" },
  ATTENTION_REQUIRED: { dot: "bg-rose-400", text: "text-rose-300", label: "Attention required" },
};

export function TopNav({ page, onNavigate, health, backendOnline }: { page: Page; onNavigate: (p: Page) => void; health: FleetHealth | null; backendOnline: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const status = !backendOnline
    ? { dot: "bg-slate-500", text: "text-slate-400", label: "Backend offline" }
    : health
      ? healthStyle[health]
      : { dot: "bg-slate-500", text: "text-slate-400", label: "Connecting" };

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 border-b border-line bg-navy-900/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1600px] items-center gap-6 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md border border-sky-500/30 bg-sky-500/10 text-sky-300">
            <Radar size={18} />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide text-white">UAV-GPT</div>
            <div className="hidden whitespace-nowrap text-[11px] text-slate-400 sm:block">Intelligent Drone Logistics Operations</div>
          </div>
        </div>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => onNavigate(n.id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                page === n.id ? "bg-navy-700 text-white" : "text-slate-400 hover:bg-navy-800 hover:text-slate-200"
              }`}
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className={`hidden items-center gap-2 text-xs font-medium sm:flex ${status.text}`}>
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <Activity size={14} className="opacity-70" />
            <span>{status.label}</span>
          </div>
          <div className="hidden items-center gap-1.5 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-300 lg:flex">
            <FlaskConical size={12} />
            Demo environment · simulated data
          </div>
          <div className="font-mono text-sm tabular-nums text-slate-200" title={now.toISOString()}>
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </div>
          <div className="flex items-center gap-2 rounded-md border border-line bg-navy-800 px-2 py-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-600 text-slate-200">
              <UserRound size={14} />
            </div>
            <div className="hidden leading-tight sm:block">
              <div className="text-xs font-medium text-slate-100">Operations Manager</div>
              <div className="text-[10px] text-slate-400">Mumbai Control Tower</div>
            </div>
          </div>
        </div>
      </div>
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-line bg-navy-900 px-2 py-1 md:hidden">
        {NAV.map((n) => (
          <button key={n.id} type="button" onClick={() => onNavigate(n.id)} className={`shrink-0 rounded px-2.5 py-1 text-xs ${page === n.id ? "bg-navy-700 text-white" : "text-slate-400"}`}>
            {n.label}
          </button>
        ))}
      </nav>
    </header>
  );
}
