// Mirrors backend/src/types.ts. All telemetry is simulated demo data.

export type DroneStatus = "FLYING" | "IDLE" | "RETURNING";
export type CorridorStatus = "WITHIN_CORRIDOR" | "OUTSIDE_CORRIDOR" | "NOT_APPLICABLE";

export interface GeoPoint {
  name: string;
  latitude: number;
  longitude: number;
}

export interface Drone {
  drone_id: string;
  status: DroneStatus;
  battery_percent: number;
  altitude_m: number;
  speed_kmh: number;
  latitude: number;
  longitude: number;
  active_order_id: string | null;
  eta_minutes: number | null;
  corridor_status: CorridorStatus;
  corridor_deviation_m: number;
  route: { origin: GeoPoint; destination: GeoPoint } | null;
  last_telemetry_at: string;
}

export type DeliveryStatus = "ASSIGNED" | "IN_TRANSIT" | "DELAYED" | "DELIVERED";
export type DeliveryPriority = "STANDARD" | "HIGH" | "CRITICAL";

export interface Delivery {
  order_id: string;
  drone_id: string | null;
  origin: GeoPoint;
  destination: GeoPoint;
  status: DeliveryStatus;
  eta_minutes: number | null;
  priority: DeliveryPriority;
  payload: string;
  status_note: string | null;
}

export type AlertCategory = "CORRIDOR_DEPARTURE" | "LOW_BATTERY" | "COMMUNICATION_LOSS" | "DELIVERY_DELAY";
export type AlertSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Alert {
  alert_id: string;
  drone_id: string;
  category: AlertCategory;
  severity: AlertSeverity;
  description: string;
  created_at: string;
  acknowledged: boolean;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
}

export type FleetHealth = "NOMINAL" | "MONITOR" | "ATTENTION_REQUIRED";

export interface OpsSummary {
  active_drones: number;
  active_deliveries: number;
  delayed_deliveries: number;
  open_alerts: number;
  fleet_health: FleetHealth;
  simulated: true;
  generated_at: string;
}

export interface VoiceConfig {
  configured: boolean;
  missing: string[];
  org_id: string | null;
  workspace_id: string | null;
  app_id: string | null;
  agent_version: string | null;
  tools_configured: boolean;
}

export const LOW_BATTERY_THRESHOLD = 25;

/** Drone-level derived state used for markers, filters and badges. */
export type DroneCondition = "ALERT" | "LOW_BATTERY" | "NORMAL";

export const openAlertsFor = (drone: Drone, alerts: Alert[]) => alerts.filter((a) => a.drone_id === drone.drone_id && !a.acknowledged);

export function droneCondition(drone: Drone, alerts: Alert[]): DroneCondition {
  const open = openAlertsFor(drone, alerts);
  if (drone.corridor_status === "OUTSIDE_CORRIDOR" || open.some((a) => a.category === "CORRIDOR_DEPARTURE" || a.category === "COMMUNICATION_LOSS")) return "ALERT";
  if (drone.battery_percent < LOW_BATTERY_THRESHOLD || open.some((a) => a.category === "LOW_BATTERY")) return "LOW_BATTERY";
  return "NORMAL";
}
