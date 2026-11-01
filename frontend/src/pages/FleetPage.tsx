import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FleetMap } from "../components/fleet/FleetMap";
import { FleetTable } from "../components/fleet/FleetTable";
import { Panel } from "../components/common/ui";
import type { OpsData } from "../hooks/useOpsData";

export function FleetPage({ data, selectedDroneId, onSelectDrone }: { data: OpsData; selectedDroneId: string | null; onSelectDrone: (id: string) => void }) {
  const batteryData = data.drones.map((d) => ({ id: d.drone_id, battery: d.battery_percent }));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Fleet map" subtitle="Simulated positions along assigned corridors" className="xl:col-span-2">
          <FleetMap drones={data.drones} alerts={data.alerts} selectedId={selectedDroneId} onSelect={onSelectDrone} />
        </Panel>
        <Panel title="Battery levels" subtitle="Reserve threshold 25%">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={batteryData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid stroke="#1e2a44" vertical={false} />
                <XAxis dataKey="id" tick={{ fill: "#94a3b8", fontSize: 11, fontFamily: "ui-monospace, monospace" }} axisLine={{ stroke: "#1e2a44" }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: "#172339" }} contentStyle={{ background: "#0b1120", border: "1px solid #2b3b5c", borderRadius: 6, fontSize: 12 }} labelStyle={{ color: "#e2e8f0" }} formatter={(v) => [`${v}%`, "Battery"]} />
                <Bar dataKey="battery" radius={[3, 3, 0, 0]} onClick={(entry) => onSelectDrone((entry as { id: string }).id)}>
                  {batteryData.map((d) => (
                    <Cell key={d.id} fill={d.battery < 25 ? "#fb7185" : d.battery < 50 ? "#fbbf24" : "#34d399"} cursor="pointer" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>
      <Panel title="Fleet status" subtitle="All drones · click a row for details">
        <FleetTable drones={data.drones} alerts={data.alerts} selectedId={selectedDroneId} onSelect={onSelectDrone} />
      </Panel>
    </div>
  );
}
