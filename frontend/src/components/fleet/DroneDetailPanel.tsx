import { useState } from "react";
import { ArrowRight, BatteryMedium, Gauge, MountainSnow, Navigation, ShieldAlert, X } from "lucide-react";
import { droneCondition, type Alert, type Delivery, type Drone } from "../../types";
import { Badge, conditionTone, deliveryStatusTone, droneStatusTone, etaText, label, priorityTone, severityTone, timeAgo } from "../common/ui";

export function DroneDetailPanel({ drone, deliveries, alerts, onClose, onAcknowledge }: {
  drone: Drone;
  deliveries: Delivery[];
  alerts: Alert[];
  onClose: () => void;
  onAcknowledge: (alertId: string) => Promise<void>;
}) {
  const cond = droneCondition(drone, alerts);
  const delivery = drone.active_order_id ? deliveries.find((d) => d.order_id === drone.active_order_id) : undefined;
  const droneAlerts = alerts.filter((a) => a.drone_id === drone.drone_id);
  const [busy, setBusy] = useState<string | null>(null);

  const stat = (icon: React.ReactNode, name: string, value: string) => (
    <div className="rounded-md border border-line bg-navy-900 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400">{icon}{name}</div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-white">{value}</div>
    </div>
  );

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-navy-900 shadow-2xl">
      <header className="flex items-start justify-between border-b border-line px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-xl font-semibold text-white">{drone.drone_id}</h2>
            <Badge variant={droneStatusTone[drone.status]}>{drone.status}</Badge>
            <Badge variant={conditionTone[cond]}>{label(cond)}</Badge>
          </div>
          <p className="mt-1 text-xs text-slate-400">Simulated telemetry · updated {timeAgo(drone.last_telemetry_at)}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-navy-700 hover:text-white" aria-label="Close">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        <div className="grid grid-cols-2 gap-2">
          {stat(<BatteryMedium size={12} />, "Battery", `${drone.battery_percent}%`)}
          {stat(<MountainSnow size={12} />, "Altitude", `${drone.altitude_m} m`)}
          {stat(<Gauge size={12} />, "Speed", `${drone.speed_kmh} km/h`)}
          {stat(<Navigation size={12} />, "ETA", etaText(drone.eta_minutes))}
        </div>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Flight corridor</h3>
          <div className={`rounded-md border px-3 py-2.5 text-sm ${drone.corridor_status === "OUTSIDE_CORRIDOR" ? "border-rose-500/40 bg-rose-500/10 text-rose-200" : "border-line bg-navy-900 text-slate-200"}`}>
            {drone.corridor_status === "OUTSIDE_CORRIDOR" && <div className="font-semibold">Outside assigned corridor by {drone.corridor_deviation_m} m</div>}
            {drone.corridor_status === "WITHIN_CORRIDOR" && <div>Within assigned corridor</div>}
            {drone.corridor_status === "NOT_APPLICABLE" && <div>On ground — no corridor assigned</div>}
            {drone.route && (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                {drone.route.origin.name} <ArrowRight size={12} /> {drone.route.destination.name}
              </div>
            )}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active delivery</h3>
          {delivery ? (
            <div className="rounded-md border border-line bg-navy-900 px-3 py-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-mono font-semibold text-white">{delivery.order_id}</span>
                <span className="flex gap-1.5"><Badge variant={priorityTone[delivery.priority]}>{delivery.priority}</Badge><Badge variant={deliveryStatusTone[delivery.status]}>{label(delivery.status)}</Badge></span>
              </div>
              <div className="mt-1.5 text-slate-300">{delivery.payload}</div>
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">{delivery.origin.name} <ArrowRight size={12} /> {delivery.destination.name} · ETA {etaText(delivery.eta_minutes)}</div>
              {delivery.status_note && <div className="mt-1.5 text-xs text-amber-300">{delivery.status_note}</div>}
            </div>
          ) : (
            <div className="rounded-md border border-line bg-navy-900 px-3 py-2.5 text-sm text-slate-400">No active delivery</div>
          )}
        </section>

        <section>
          <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400"><ShieldAlert size={12} /> Incidents ({droneAlerts.length})</h3>
          <div className="space-y-2">
            {droneAlerts.length === 0 && <div className="rounded-md border border-line bg-navy-900 px-3 py-2.5 text-sm text-slate-400">No incidents for this drone</div>}
            {droneAlerts.map((a) => (
              <div key={a.alert_id} className="rounded-md border border-line bg-navy-900 px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-semibold text-white">{a.alert_id}</span>
                  <span className="flex gap-1.5"><Badge variant={severityTone[a.severity]}>{a.severity}</Badge><Badge>{label(a.category)}</Badge></span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-300">{a.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">{timeAgo(a.created_at)}</span>
                  {a.acknowledged ? (
                    <span className="text-[11px] text-emerald-300">Acknowledged by {a.acknowledged_by}</span>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === a.alert_id}
                      onClick={async () => { setBusy(a.alert_id); try { await onAcknowledge(a.alert_id); } finally { setBusy(null); } }}
                      className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-1 text-xs font-medium text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
                    >
                      {busy === a.alert_id ? "Acknowledging…" : "Acknowledge"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-[11px] text-slate-500">Position: {drone.latitude.toFixed(4)}, {drone.longitude.toFixed(4)} (simulated). UAV-GPT is decision support only; it does not issue flight-control commands.</p>
      </div>
    </aside>
  );
}
