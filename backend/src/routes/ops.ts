import { Router } from "express";
import { opsService } from "../services/opsService";

// Dashboard-facing operational API (same-origin, read + acknowledge only).
export const opsRouter = Router();

opsRouter.get("/health", (_req, res) => {
  res.json({ status: "ok", simulated: true, time: new Date().toISOString() });
});

opsRouter.get("/ops/summary", (_req, res) => {
  res.json(opsService.summary());
});

opsRouter.get("/drones", (_req, res) => {
  res.json(opsService.listDrones());
});

opsRouter.get("/drones/:droneId", (req, res) => {
  const drone = opsService.getDrone(String(req.params.droneId));
  if (!drone) {
    res.status(404).json({ error: `Drone ${req.params.droneId} not found` });
    return;
  }
  res.json(drone);
});

opsRouter.get("/deliveries", (_req, res) => {
  res.json(opsService.listDeliveries());
});

opsRouter.get("/deliveries/:orderId", (req, res) => {
  const delivery = opsService.getDelivery(String(req.params.orderId));
  if (!delivery) {
    res.status(404).json({ error: `Delivery ${req.params.orderId} not found` });
    return;
  }
  res.json(delivery);
});

opsRouter.get("/alerts", (req, res) => {
  const status = req.query.status === "open" || req.query.status === "acknowledged" ? req.query.status : "all";
  res.json(opsService.listAlerts(status));
});

opsRouter.get("/alerts/:alertId", (req, res) => {
  const alert = opsService.getAlert(String(req.params.alertId));
  if (!alert) {
    res.status(404).json({ error: `Alert ${req.params.alertId} not found` });
    return;
  }
  res.json(alert);
});

opsRouter.post("/alerts/:alertId/acknowledge", (req, res) => {
  const by = typeof req.body?.acknowledged_by === "string" && req.body.acknowledged_by.trim()
    ? req.body.acknowledged_by.trim()
    : "Operations Manager";
  const alert = opsService.acknowledgeAlert(String(req.params.alertId), by);
  if (!alert) {
    res.status(404).json({ error: `Alert ${req.params.alertId} not found` });
    return;
  }
  res.json(alert);
});
