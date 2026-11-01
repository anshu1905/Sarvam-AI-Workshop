import { useMemo, useState } from "react";
import { BatteryWarning, CheckCircle2, Clock3, RadioTower, Route } from "lucide-react";
import type { Alert, AlertCategory } from "../../types";
import { Badge, FilterTabs, label, severityTone, Td, Th, timeAgo } from "../common/ui";

type Filter = "OPEN" | "ACKNOWLEDGED" | "ALL";

const categoryIcon: Record<AlertCategory, React.ReactNode> = {
  CORRIDOR_DEPARTURE: <Route size={14} />,
  LOW_BATTERY: <BatteryWarning size={14} />,
  COMMUNICATION_LOSS: <RadioTower size={14} />,
  DELIVERY_DELAY: <Clock3 size={14} />,
};

const severityRow: Record<Alert["severity"], string> = {
  LOW: "border-l-slate-500",
  MEDIUM: "border-l-amber-400",
  HIGH: "border-l-rose-400",
  CRITICAL: "border-l-rose-500",
};

export function IncidentPanel({ alerts, onAcknowledge, onSelectDrone, highlightDroneId, showFilter = true }: {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => Promise<void>;
  onSelectDrone?: (id: string) => void;
  highlightDroneId?: string | null;
  showFilter?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rows = useMemo(() => {
    const sorted = [...alerts].sort((a, b) => Number(a.acknowledged) - Number(b.acknowledged) || b.created_at.localeCompare(a.created_at));
    if (filter === "OPEN") return sorted.filter((a) => !a.acknowledged);
    if (filter === "ACKNOWLEDGED") return sorted.filter((a) => a.acknowledged);
    return sorted;
  }, [alerts, filter]);

  const ack = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await onAcknowledge(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Acknowledgement failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      {showFilter && (
        <div className="mb-3 flex items-center justify-between gap-3">
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "ALL", label: "All", count: alerts.length },
              { value: "OPEN", label: "Open", count: alerts.filter((a) => !a.acknowledged).length },
              { value: "ACKNOWLEDGED", label: "Acknowledged", count: alerts.filter((a) => a.acknowledged).length },
            ]}
          />
          {error && <span className="text-xs text-rose-300">{error}</span>}
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[860px] border-collapse">
          <thead className="bg-navy-900">
            <tr>
              <Th>Incident</Th><Th>Drone</Th><Th>Category</Th><Th>Severity</Th><Th>Description</Th><Th>Raised</Th><Th>Acknowledgement</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.alert_id} className={`border-t border-l-2 border-line ${severityRow[a.severity]} ${highlightDroneId === a.drone_id ? "bg-rose-500/5" : ""} ${a.acknowledged ? "opacity-70" : ""}`}>
                <Td className="font-mono font-semibold text-white">{a.alert_id}</Td>
                <Td className="font-mono"><button type="button" onClick={() => onSelectDrone?.(a.drone_id)} className="text-sky-300 hover:underline">{a.drone_id}</button></Td>
                <Td><span className="flex items-center gap-1.5 text-slate-300">{categoryIcon[a.category]}{label(a.category)}</span></Td>
                <Td><Badge variant={severityTone[a.severity]}>{a.severity}</Badge></Td>
                <Td className="max-w-md text-xs leading-relaxed text-slate-300">{a.description}</Td>
                <Td className="whitespace-nowrap text-xs text-slate-400" >{timeAgo(a.created_at)}</Td>
                <Td>
                  {a.acknowledged ? (
                    <span className="flex items-center gap-1.5 text-xs text-emerald-300"><CheckCircle2 size={14} />{a.acknowledged_by}<span className="text-slate-500">· {a.acknowledged_at ? timeAgo(a.acknowledged_at) : ""}</span></span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === a.alert_id}
                      onClick={() => void ack(a.alert_id)}
                      className="rounded border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
                    >
                      {busy === a.alert_id ? "Acknowledging…" : "Acknowledge"}
                    </button>
                  )}
                </Td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">No incidents.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
