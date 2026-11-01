import { useMemo, useState } from "react";
import { droneCondition, openAlertsFor, type Alert, type Drone } from "../../types";
import { Badge, BatteryBar, conditionTone, droneStatusTone, etaText, FilterTabs, label, Td, Th } from "../common/ui";

type Filter = "ALL" | "FLYING" | "IDLE" | "LOW_BATTERY" | "ALERT";

export function FleetTable({ drones, alerts, selectedId, onSelect }: { drones: Drone[]; alerts: Alert[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const rows = useMemo(() => {
    const withCond = drones.map((d) => ({ d, cond: droneCondition(d, alerts) }));
    switch (filter) {
      case "FLYING": return withCond.filter((r) => r.d.status === "FLYING" || r.d.status === "RETURNING");
      case "IDLE": return withCond.filter((r) => r.d.status === "IDLE");
      case "LOW_BATTERY": return withCond.filter((r) => r.d.battery_percent < 25);
      case "ALERT": return withCond.filter((r) => r.cond === "ALERT" || openAlertsFor(r.d, alerts).length > 0);
      default: return withCond;
    }
  }, [drones, alerts, filter]);

  const counts = useMemo(() => ({
    ALL: drones.length,
    FLYING: drones.filter((d) => d.status === "FLYING" || d.status === "RETURNING").length,
    IDLE: drones.filter((d) => d.status === "IDLE").length,
    LOW_BATTERY: drones.filter((d) => d.battery_percent < 25).length,
    ALERT: drones.filter((d) => droneCondition(d, alerts) === "ALERT" || openAlertsFor(d, alerts).length > 0).length,
  }), [drones, alerts]);

  return (
    <div>
      <div className="mb-3">
        <FilterTabs
          value={filter}
          onChange={setFilter}
          options={[
            { value: "ALL", label: "All drones", count: counts.ALL },
            { value: "FLYING", label: "Flying", count: counts.FLYING },
            { value: "IDLE", label: "Idle", count: counts.IDLE },
            { value: "LOW_BATTERY", label: "Low battery", count: counts.LOW_BATTERY },
            { value: "ALERT", label: "Alert", count: counts.ALERT },
          ]}
        />
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[720px] border-collapse">
          <thead className="bg-navy-900">
            <tr>
              <Th>Drone ID</Th><Th>Status</Th><Th>Battery</Th><Th>Altitude</Th><Th>Speed</Th><Th>Order ID</Th><Th>ETA</Th><Th>Corridor</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ d, cond }) => (
              <tr
                key={d.drone_id}
                onClick={() => onSelect(d.drone_id)}
                className={`cursor-pointer border-t border-line transition-colors hover:bg-navy-700/60 ${selectedId === d.drone_id ? "bg-navy-700/80" : ""}`}
              >
                <Td className="font-mono font-semibold text-white">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${cond === "ALERT" ? "bg-rose-400" : cond === "LOW_BATTERY" ? "bg-amber-400" : "bg-sky-400"}`} />
                    {d.drone_id}
                  </span>
                </Td>
                <Td><Badge variant={droneStatusTone[d.status]}>{d.status}</Badge></Td>
                <Td><BatteryBar percent={d.battery_percent} /></Td>
                <Td className="font-mono tabular-nums">{d.altitude_m} m</Td>
                <Td className="font-mono tabular-nums">{d.speed_kmh} km/h</Td>
                <Td className="font-mono">{d.active_order_id ?? <span className="text-slate-500">—</span>}</Td>
                <Td className="font-mono tabular-nums">{etaText(d.eta_minutes)}</Td>
                <Td>
                  {d.corridor_status === "OUTSIDE_CORRIDOR" ? (
                    <Badge variant="danger">Outside · {d.corridor_deviation_m} m</Badge>
                  ) : d.corridor_status === "NOT_APPLICABLE" ? (
                    <span className="text-xs text-slate-500">On ground</span>
                  ) : (
                    <Badge variant={conditionTone[cond] === "danger" ? "danger" : "success"}>{label("WITHIN")}</Badge>
                  )}
                </Td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">No drones match this filter.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
