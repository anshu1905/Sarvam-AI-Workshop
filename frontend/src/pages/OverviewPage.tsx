import { AlertTriangle } from "lucide-react";
import { KpiCards } from "../components/dashboard/KpiCards";
import { FleetMap } from "../components/fleet/FleetMap";
import { FleetTable } from "../components/fleet/FleetTable";
import { DeliveryTable } from "../components/deliveries/DeliveryTable";
import { IncidentPanel } from "../components/incidents/IncidentPanel";
import { Badge, label, Panel, severityTone, timeAgo } from "../components/common/ui";
import type { OpsData } from "../hooks/useOpsData";

export function OverviewPage({ data, selectedDroneId, onSelectDrone }: { data: OpsData; selectedDroneId: string | null; onSelectDrone: (id: string) => void }) {
  const openAlerts = data.alerts.filter((a) => !a.acknowledged);
  const activeDeliveries = data.deliveries.filter((d) => d.status !== "DELIVERED");

  return (
    <div className="space-y-4">
      <KpiCards summary={data.summary} />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Flight operations — Mumbai network" subtitle="Schematic view of corridors, drones and delivery sites" className="xl:col-span-2">
          <FleetMap drones={data.drones} alerts={data.alerts} selectedId={selectedDroneId} onSelect={onSelectDrone} />
        </Panel>

        <Panel title="Open safety alerts" subtitle={`${openAlerts.length} requiring attention`}>
          <div className="space-y-2">
            {openAlerts.length === 0 && <div className="rounded-md border border-line bg-navy-900 px-3 py-4 text-center text-sm text-slate-400">All incidents acknowledged.</div>}
            {openAlerts.map((a) => (
              <button
                key={a.alert_id}
                type="button"
                onClick={() => onSelectDrone(a.drone_id)}
                className="block w-full rounded-md border border-line bg-navy-900 px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-navy-700/60"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-mono text-sm font-semibold text-white">
                    <AlertTriangle size={14} className={a.severity === "HIGH" || a.severity === "CRITICAL" ? "text-rose-400" : "text-amber-400"} />
                    {a.alert_id} · {a.drone_id}
                  </span>
                  <Badge variant={severityTone[a.severity]}>{a.severity}</Badge>
                </div>
                <div className="mt-1 text-xs font-medium text-slate-300">{label(a.category)}</div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{a.description}</p>
                <div className="mt-1.5 text-[11px] text-slate-500">{timeAgo(a.created_at)}</div>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Fleet status" subtitle="Click a row for drone details">
        <FleetTable drones={data.drones} alerts={data.alerts} selectedId={selectedDroneId} onSelect={onSelectDrone} />
      </Panel>

      <Panel title="Delivery monitoring" subtitle={`${activeDeliveries.length} active deliveries`}>
        <DeliveryTable deliveries={activeDeliveries} compact onSelectDrone={onSelectDrone} />
      </Panel>

      <Panel title="Incident monitoring" subtitle="Operational and flight-safety incidents">
        <IncidentPanel alerts={data.alerts} onAcknowledge={data.acknowledge} onSelectDrone={onSelectDrone} highlightDroneId={selectedDroneId} />
      </Panel>
    </div>
  );
}
