import { useMemo } from "react";
import { droneCondition, type Alert, type Drone, type GeoPoint } from "../../types";

// Schematic (not geographic) projection of a simplified Mumbai delivery network.
const BOUNDS = { minLon: 72.8, maxLon: 72.945, minLat: 18.985, maxLat: 19.14 };
const W = 820;
const H = 520;

function project(p: { latitude: number; longitude: number }) {
  const x = ((p.longitude - BOUNDS.minLon) / (BOUNDS.maxLon - BOUNDS.minLon)) * W;
  const y = ((BOUNDS.maxLat - p.latitude) / (BOUNDS.maxLat - BOUNDS.minLat)) * H;
  return { x, y };
}

const conditionColor = { NORMAL: "#38bdf8", LOW_BATTERY: "#fbbf24", ALERT: "#fb7185" } as const;

export function FleetMap({ drones, alerts, selectedId, onSelect }: { drones: Drone[]; alerts: Alert[]; selectedId: string | null; onSelect: (id: string) => void }) {
  const { hubs, destinations } = useMemo(() => {
    const hubs = new Map<string, GeoPoint>();
    const destinations = new Map<string, GeoPoint>();
    for (const d of drones) {
      if (!d.route) continue;
      for (const p of [d.route.origin, d.route.destination]) {
        (p.name.includes("Hub") || p.name.includes("Depot") || p.name.includes("Centre") ? hubs : destinations).set(p.name, p);
      }
    }
    return { hubs: [...hubs.values()], destinations: [...destinations.values()] };
  }, [drones]);

  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-navy-950">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Schematic fleet map">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#162038" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />

        {/* Corridors: wide translucent band + centreline for each active route */}
        {drones.map((d) => {
          if (!d.route) return null;
          const a = project(d.route.origin);
          const b = project(d.route.destination);
          const alert = d.corridor_status === "OUTSIDE_CORRIDOR";
          return (
            <g key={`route-${d.drone_id}`}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={alert ? "#fb7185" : "#38bdf8"} strokeOpacity={0.12} strokeWidth={14} strokeLinecap="round" />
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={alert ? "#fb7185" : "#7dd3fc"} strokeOpacity={0.5} strokeWidth={1.2} strokeDasharray="5 5" />
            </g>
          );
        })}

        {/* Destinations */}
        {destinations.map((p) => {
          const { x, y } = project(p);
          return (
            <g key={p.name}>
              <circle cx={x} cy={y} r={4} fill="#0b1120" stroke="#94a3b8" strokeWidth={1.5} />
              <text x={x + 8} y={y + 4} fontSize={11} fill="#94a3b8" fontFamily="ui-sans-serif, system-ui">{p.name}</text>
            </g>
          );
        })}

        {/* Hubs */}
        {hubs.map((p) => {
          const { x, y } = project(p);
          return (
            <g key={p.name}>
              <rect x={x - 6} y={y - 6} width={12} height={12} rx={2} fill="#0b1120" stroke="#e2e8f0" strokeWidth={1.5} />
              <text x={x + 10} y={y - 8} fontSize={11} fontWeight={600} fill="#e2e8f0" fontFamily="ui-sans-serif, system-ui">{p.name}</text>
            </g>
          );
        })}

        {/* Drones */}
        {drones.map((d) => {
          const { x, y } = project(d);
          const cond = droneCondition(d, alerts);
          const color = conditionColor[cond];
          const selected = selectedId === d.drone_id;
          const heading = d.route ? Math.atan2(project(d.route.destination).y - project(d.route.origin).y, project(d.route.destination).x - project(d.route.origin).x) * (180 / Math.PI) + 90 : 0;
          return (
            <g key={d.drone_id} className="cursor-pointer" onClick={() => onSelect(d.drone_id)}>
              {cond === "ALERT" && <circle cx={x} cy={y} r={10} fill="none" stroke={color} strokeWidth={1.5} className="alert-ring" />}
              {selected && <circle cx={x} cy={y} r={14} fill="none" stroke="#ffffff" strokeOpacity={0.6} strokeWidth={1} strokeDasharray="3 3" />}
              <circle cx={x} cy={y} r={11} fill="#0b1120" stroke={color} strokeWidth={selected ? 2.5 : 1.5} />
              {d.status === "IDLE" ? (
                <circle cx={x} cy={y} r={3.5} fill={color} />
              ) : (
                <polygon points="0,-6 5,5 0,2.5 -5,5" fill={color} transform={`translate(${x} ${y}) rotate(${heading})`} />
              )}
              <text x={x} y={y + 24} fontSize={11} fontWeight={600} fill={color} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace">{d.drone_id}</text>
              {cond === "ALERT" && (
                <text x={x + 14} y={y - 10} fontSize={10} fontWeight={700} fill={color} fontFamily="ui-monospace, Menlo, monospace">{d.corridor_deviation_m > 0 ? `+${d.corridor_deviation_m} m` : "ALERT"}</text>
              )}
            </g>
          );
        })}
      </svg>

      <div className="pointer-events-none absolute left-3 top-3 rounded border border-line bg-navy-900/90 px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-300">
        Simulated operational environment · schematic, not to scale
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line bg-navy-900 px-3 py-2 text-[11px] text-slate-300">
        <Legend color={conditionColor.NORMAL} text="Normal" />
        <Legend color={conditionColor.LOW_BATTERY} text="Low battery" />
        <Legend color={conditionColor.ALERT} text="Corridor / alert" />
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-[2px] border border-slate-200" /> Hub</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full border border-slate-400" /> Destination</span>
        <span className="flex items-center gap-1.5"><span className="h-0 w-4 border-t border-dashed border-sky-300/70" /> Corridor</span>
      </div>
    </div>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {text}
    </span>
  );
}
