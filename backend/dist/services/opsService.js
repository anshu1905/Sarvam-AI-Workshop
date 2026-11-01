"use strict";
// In-memory data service. Routes never touch the arrays directly — they go through here.
Object.defineProperty(exports, "__esModule", { value: true });
exports.opsService = void 0;
const demoData_1 = require("../data/demoData");
const LOW_BATTERY_THRESHOLD = 25;
const ACTIVE_DELIVERY_STATUSES = new Set(["ASSIGNED", "IN_TRANSIT", "DELAYED"]);
exports.opsService = {
    listDrones() {
        return demoData_1.DRONES;
    },
    getDrone(droneId) {
        const id = droneId.trim().toUpperCase();
        return demoData_1.DRONES.find((d) => d.drone_id === id);
    },
    listDeliveries() {
        return demoData_1.DELIVERIES;
    },
    getDelivery(orderId) {
        const id = orderId.trim().toUpperCase();
        return demoData_1.DELIVERIES.find((d) => d.order_id === id);
    },
    listAlerts(status) {
        if (status === "open")
            return demoData_1.ALERTS.filter((a) => !a.acknowledged);
        if (status === "acknowledged")
            return demoData_1.ALERTS.filter((a) => a.acknowledged);
        return demoData_1.ALERTS;
    },
    getAlert(alertId) {
        const id = alertId.trim().toUpperCase();
        return demoData_1.ALERTS.find((a) => a.alert_id === id);
    },
    /** Idempotent: acknowledging an already-acknowledged alert returns it unchanged. */
    acknowledgeAlert(alertId, acknowledgedBy) {
        const alert = this.getAlert(alertId);
        if (!alert)
            return undefined;
        if (!alert.acknowledged) {
            alert.acknowledged = true;
            alert.acknowledged_by = acknowledgedBy;
            alert.acknowledged_at = new Date().toISOString();
        }
        return alert;
    },
    lowBatteryDrones() {
        return demoData_1.DRONES.filter((d) => d.battery_percent < LOW_BATTERY_THRESHOLD);
    },
    outsideCorridorDrones() {
        return demoData_1.DRONES.filter((d) => d.corridor_status === "OUTSIDE_CORRIDOR");
    },
    summary() {
        const openAlerts = this.listAlerts("open");
        const activeDeliveries = demoData_1.DELIVERIES.filter((d) => ACTIVE_DELIVERY_STATUSES.has(d.status));
        const delayed = demoData_1.DELIVERIES.filter((d) => d.status === "DELAYED");
        let fleet_health = "NOMINAL";
        if (openAlerts.some((a) => a.severity === "HIGH" || a.severity === "CRITICAL")) {
            fleet_health = "ATTENTION_REQUIRED";
        }
        else if (openAlerts.length > 0 || delayed.length > 0) {
            fleet_health = "MONITOR";
        }
        return {
            active_drones: demoData_1.DRONES.length,
            active_deliveries: activeDeliveries.length,
            delayed_deliveries: delayed.length,
            open_alerts: openAlerts.length,
            fleet_health,
            simulated: true,
            generated_at: new Date().toISOString(),
        };
    },
};
//# sourceMappingURL=opsService.js.map