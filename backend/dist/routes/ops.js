"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.opsRouter = void 0;
const express_1 = require("express");
const opsService_1 = require("../services/opsService");
// Dashboard-facing operational API (same-origin, read + acknowledge only).
exports.opsRouter = (0, express_1.Router)();
exports.opsRouter.get("/health", (_req, res) => {
    res.json({ status: "ok", simulated: true, time: new Date().toISOString() });
});
exports.opsRouter.get("/ops/summary", (_req, res) => {
    res.json(opsService_1.opsService.summary());
});
exports.opsRouter.get("/drones", (_req, res) => {
    res.json(opsService_1.opsService.listDrones());
});
exports.opsRouter.get("/drones/:droneId", (req, res) => {
    const drone = opsService_1.opsService.getDrone(String(req.params.droneId));
    if (!drone) {
        res.status(404).json({ error: `Drone ${req.params.droneId} not found` });
        return;
    }
    res.json(drone);
});
exports.opsRouter.get("/deliveries", (_req, res) => {
    res.json(opsService_1.opsService.listDeliveries());
});
exports.opsRouter.get("/deliveries/:orderId", (req, res) => {
    const delivery = opsService_1.opsService.getDelivery(String(req.params.orderId));
    if (!delivery) {
        res.status(404).json({ error: `Delivery ${req.params.orderId} not found` });
        return;
    }
    res.json(delivery);
});
exports.opsRouter.get("/alerts", (req, res) => {
    const status = req.query.status === "open" || req.query.status === "acknowledged" ? req.query.status : "all";
    res.json(opsService_1.opsService.listAlerts(status));
});
exports.opsRouter.get("/alerts/:alertId", (req, res) => {
    const alert = opsService_1.opsService.getAlert(String(req.params.alertId));
    if (!alert) {
        res.status(404).json({ error: `Alert ${req.params.alertId} not found` });
        return;
    }
    res.json(alert);
});
exports.opsRouter.post("/alerts/:alertId/acknowledge", (req, res) => {
    const by = typeof req.body?.acknowledged_by === "string" && req.body.acknowledged_by.trim()
        ? req.body.acknowledged_by.trim()
        : "Operations Manager";
    const alert = opsService_1.opsService.acknowledgeAlert(String(req.params.alertId), by);
    if (!alert) {
        res.status(404).json({ error: `Alert ${req.params.alertId} not found` });
        return;
    }
    res.json(alert);
});
//# sourceMappingURL=ops.js.map