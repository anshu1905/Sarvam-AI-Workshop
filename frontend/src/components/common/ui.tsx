import type { ReactNode } from "react";
import type { AlertSeverity, DeliveryPriority, DeliveryStatus, DroneCondition, DroneStatus } from "../../types";

export function Panel({ title, subtitle, actions, children, className = "" }: {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-line bg-navy-800/80 shadow-[0_1px_0_0_rgba(255,255,255,0.02)_inset,0_8px_24px_-12px_rgba(0,0,0,0.6)] ${className}`}>
      {(title || actions) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold tracking-wide text-slate-100">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

const tone = {
  neutral: "border-line-strong bg-navy-700 text-slate-300",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-300",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-300",
} as const;
export type Tone = keyof typeof tone;

export function Badge({ children, variant = "neutral", className = "" }: { children: ReactNode; variant?: Tone; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ${tone[variant]} ${className}`}>
      {children}
    </span>
  );
}

export const droneStatusTone: Record<DroneStatus, Tone> = { FLYING: "info", IDLE: "neutral", RETURNING: "success" };
export const conditionTone: Record<DroneCondition, Tone> = { ALERT: "danger", LOW_BATTERY: "warning", NORMAL: "success" };
export const deliveryStatusTone: Record<DeliveryStatus, Tone> = { ASSIGNED: "neutral", IN_TRANSIT: "info", DELAYED: "warning", DELIVERED: "success" };
export const priorityTone: Record<DeliveryPriority, Tone> = { STANDARD: "neutral", HIGH: "warning", CRITICAL: "danger" };
export const severityTone: Record<AlertSeverity, Tone> = { LOW: "neutral", MEDIUM: "warning", HIGH: "danger", CRITICAL: "danger" };

export const label = (s: string) => s.replace(/_/g, " ");

export function BatteryBar({ percent }: { percent: number }) {
  const color = percent < 25 ? "bg-rose-400" : percent < 50 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-navy-600">
        <div className={`h-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-slate-200">{percent}%</span>
    </div>
  );
}

export function FilterTabs<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string; count?: number }>; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-md border border-line bg-navy-900 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
            value === o.value ? "bg-navy-600 text-white" : "text-slate-400 hover:bg-navy-700 hover:text-slate-200"
          }`}
        >
          {o.label}
          {o.count !== undefined && <span className="ml-1.5 font-mono text-[10px] text-slate-400">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Th({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 ${className}`}>{children}</th>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 text-sm text-slate-200 ${className}`}>{children}</td>;
}

export const etaText = (m: number | null) => (m === null ? "—" : m === 0 ? "Arrived" : `${m} min`);

export function timeAgo(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min ago`;
}
