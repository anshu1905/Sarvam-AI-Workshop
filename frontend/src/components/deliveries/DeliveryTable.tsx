import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Delivery, DeliveryStatus } from "../../types";
import { Badge, deliveryStatusTone, etaText, FilterTabs, label, priorityTone, Td, Th } from "../common/ui";

type Filter = "ALL" | DeliveryStatus;

export function DeliveryTable({ deliveries, compact = false, onSelectDrone }: { deliveries: Delivery[]; compact?: boolean; onSelectDrone?: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const rows = useMemo(() => (filter === "ALL" ? deliveries : deliveries.filter((d) => d.status === filter)), [deliveries, filter]);
  const count = (s: DeliveryStatus) => deliveries.filter((d) => d.status === s).length;

  return (
    <div>
      {!compact && (
        <div className="mb-3">
          <FilterTabs
            value={filter}
            onChange={setFilter}
            options={[
              { value: "ALL", label: "All", count: deliveries.length },
              { value: "ASSIGNED", label: "Assigned", count: count("ASSIGNED") },
              { value: "IN_TRANSIT", label: "In transit", count: count("IN_TRANSIT") },
              { value: "DELAYED", label: "Delayed", count: count("DELAYED") },
              { value: "DELIVERED", label: "Delivered", count: count("DELIVERED") },
            ]}
          />
        </div>
      )}
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="w-full min-w-[760px] border-collapse">
          <thead className="bg-navy-900">
            <tr>
              <Th>Order ID</Th><Th>Drone ID</Th><Th>Origin</Th><Th>Destination</Th><Th>Status</Th><Th>ETA</Th><Th>Priority</Th>
              {!compact && <Th>Payload / note</Th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.order_id} className="border-t border-line hover:bg-navy-700/40">
                <Td className="font-mono font-semibold text-white">{d.order_id}</Td>
                <Td className="font-mono">
                  {d.drone_id ? (
                    <button type="button" onClick={() => onSelectDrone?.(d.drone_id!)} className="text-sky-300 hover:underline">{d.drone_id}</button>
                  ) : (
                    <span className="text-slate-500">Unassigned</span>
                  )}
                </Td>
                <Td>{d.origin.name}</Td>
                <Td><span className="flex items-center gap-1.5"><ArrowRight size={12} className="text-slate-500" />{d.destination.name}</span></Td>
                <Td><Badge variant={deliveryStatusTone[d.status]}>{label(d.status)}</Badge></Td>
                <Td className="font-mono tabular-nums">{etaText(d.eta_minutes)}</Td>
                <Td><Badge variant={priorityTone[d.priority]}>{d.priority}</Badge></Td>
                {!compact && (
                  <Td className="text-xs text-slate-400">
                    <div className="text-slate-300">{d.payload}</div>
                    {d.status_note && <div className={d.status === "DELAYED" || d.status_note.includes("INC-") ? "text-amber-300" : ""}>{d.status_note}</div>}
                  </Td>
                )}
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-sm text-slate-500">No deliveries match this filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
