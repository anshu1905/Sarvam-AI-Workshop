// Shared domain types for the UAV-GPT backend. All telemetry is simulated.

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
  /** Current route the drone is flying (origin -> destination), if any. */
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
