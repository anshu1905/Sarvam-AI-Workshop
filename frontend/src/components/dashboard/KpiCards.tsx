import { AlertTriangle, Clock, Package, Plane } from "lucide-react";
import type { OpsSummary } from "../../types";

export function KpiCards({ summary }: { summary: OpsSummary | null }) {
  const cards = [
    { label: "Active drones", value: summary?.active_drones, icon: Plane, accent: "text-sky-300 bg-sky-500/10 border-sky-500/20" },
    { label: "Active deliveries", value: summary?.active_deliveries, icon: Package, accent: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
    { label: "Delayed deliveries", value: summary?.delayed_deliveries, icon: Clock, accent: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
    { label: "Open safety alerts", value: summary?.open_alerts, icon: AlertTriangle, accent: "text-rose-300 bg-rose-500/10 border-rose-500/20" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="flex items-center gap-4 rounded-lg border border-line bg-navy-800/80 px-4 py-3.5">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md border ${c.accent}`}>
            <c.icon size={18} />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{c.label}</div>
            <div className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-white">{c.value ?? "—"}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
