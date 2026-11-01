// In-memory data service. Routes never touch the arrays directly — they go through here.

import { ALERTS, DELIVERIES, DRONES } from "../data/demoData";
import type { Alert, Delivery, Drone, FleetHealth, OpsSummary } from "../types";

const LOW_BATTERY_THRESHOLD = 25;
const ACTIVE_DELIVERY_STATUSES = new Set(["ASSIGNED", "IN_TRANSIT", "DELAYED"]);

export const opsService = {
  listDrones(): Drone[] {
    return DRONES;
  },

  getDrone(droneId: string): Drone | undefined {
    const id = droneId.trim().toUpperCase();
    return DRONES.find((d) => d.drone_id === id);
  },

  listDeliveries(): Delivery[] {
    return DELIVERIES;
  },

  getDelivery(orderId: string): Delivery | undefined {
    const id = orderId.trim().toUpperCase();
    return DELIVERIES.find((d) => d.order_id === id);
  },

  listAlerts(status?: "open" | "acknowledged" | "all"): Alert[] {
    if (status === "open") return ALERTS.filter((a) => !a.acknowledged);
    if (status === "acknowledged") return ALERTS.filter((a) => a.acknowledged);
    return ALERTS;
  },

  getAlert(alertId: string): Alert | undefined {
    const id = alertId.trim().toUpperCase();
    return ALERTS.find((a) => a.alert_id === id);
  },

  /** Idempotent: acknowledging an already-acknowledged alert returns it unchanged. */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): Alert | undefined {
    const alert = this.getAlert(alertId);
    if (!alert) return undefined;
    if (!alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledged_by = acknowledgedBy;
      alert.acknowledged_at = new Date().toISOString();
    }
    return alert;
  },

  lowBatteryDrones(): Drone[] {
    return DRONES.filter((d) => d.battery_percent < LOW_BATTERY_THRESHOLD);
  },

  outsideCorridorDrones(): Drone[] {
    return DRONES.filter((d) => d.corridor_status === "OUTSIDE_CORRIDOR");
  },

  summary(): OpsSummary {
    const openAlerts = this.listAlerts("open");
    const activeDeliveries = DELIVERIES.filter((d) => ACTIVE_DELIVERY_STATUSES.has(d.status));
    const delayed = DELIVERIES.filter((d) => d.status === "DELAYED");

    let fleet_health: FleetHealth = "NOMINAL";
    if (openAlerts.some((a) => a.severity === "HIGH" || a.severity === "CRITICAL")) {
      fleet_health = "ATTENTION_REQUIRED";
    } else if (openAlerts.length > 0 || delayed.length > 0) {
      fleet_health = "MONITOR";
    }

    return {
      active_drones: DRONES.length,
      active_deliveries: activeDeliveries.length,
      delayed_deliveries: delayed.length,
      open_alerts: openAlerts.length,
      fleet_health,
      simulated: true,
      generated_at: new Date().toISOString(),
    };
  },
};
