import { Router, type Response } from "express";
import { requireToolSecret } from "../middleware/toolAuth";
import { opsService } from "../services/opsService";
import type { Alert, Delivery, Drone } from "../types";

// Endpoints called by the Sarvam voice agent's API tools. Responses are compact and
// speech-friendly; every payload is flagged as simulated so the agent can say so.
//
// Each tool that takes an identifier is reachable two ways, because the Sarvam tool editor
// may not template path parameters:
//   path form   GET /drones/D-07            query form   GET /drones?drone_id=D-07
export const voiceToolsRouter = Router();
voiceToolsRouter.use(requireToolSecret);

const droneForVoice = (d: Drone) => ({
  drone_id: d.drone_id,
  flight_status: d.status,
  battery_percent: d.battery_percent,
  low_battery: d.battery_percent < 25,
  altitude_m: d.altitude_m,
  speed_kmh: d.speed_kmh,
  corridor_status: d.corridor_status,
  corridor_deviation_m: d.corridor_deviation_m,
  active_order_id: d.active_order_id,
  eta_minutes: d.eta_minutes,
  route: d.route ? `${d.route.origin.name} to ${d.route.destination.name}` : null,
  open_alert_ids: opsService.listAlerts("open").filter((a) => a.drone_id === d.drone_id).map((a) => a.alert_id),
});

const deliveryForVoice = (o: Delivery) => ({
  order_id: o.order_id,
  status: o.status,
  assigned_drone_id: o.drone_id,
  origin: o.origin.name,
  destination: o.destination.name,
  eta_minutes: o.eta_minutes,
  priority: o.priority,
  payload: o.payload,
  note: o.status_note,
});

const alertForVoice = (a: Alert) => ({
  alert_id: a.alert_id,
  drone_id: a.drone_id,
  category: a.category,
  severity: a.severity,
  description: a.description,
  created_at: a.created_at,
  acknowledged: a.acknowledged,
  acknowledged_by: a.acknowledged_by,
});

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");

function sendDrone(res: Response, droneId: string): void {
  if (!droneId) {
    res.status(400).json({ error: "drone_id is required (for example D-07)" });
    return;
  }
  const drone = opsService.getDrone(droneId);
  if (!drone) {
    res.status(404).json({ error: `No drone with id ${droneId}`, known_drone_ids: opsService.listDrones().map((d) => d.drone_id) });
    return;
  }
  res.json({ simulated: true, ...droneForVoice(drone) });
}

function sendDelivery(res: Response, orderId: string): void {
  if (!orderId) {
    res.status(400).json({ error: "order_id is required (for example ORD-1042)" });
    return;
  }
  const delivery = opsService.getDelivery(orderId);
  if (!delivery) {
    res.status(404).json({ error: `No delivery with order id ${orderId}` });
    return;
  }
  res.json({ simulated: true, ...deliveryForVoice(delivery) });
}

function sendAcknowledge(res: Response, alertId: string, acknowledgedBy: string): void {
  if (!alertId) {
    res.status(400).json({ error: "alert_id is required (for example INC-001)" });
    return;
  }
  const alert = opsService.acknowledgeAlert(alertId, acknowledgedBy || "Operations Manager (via UAV-GPT voice)");
  if (!alert) {
    res.status(404).json({ error: `No alert with id ${alertId}` });
    return;
  }
  res.json({ simulated: true, result: "acknowledged", ...alertForVoice(alert) });
}

// Tool 1: get_ops_summary
voiceToolsRouter.get("/ops-summary", (_req, res) => {
  const summary = opsService.summary();
  res.json({
    ...summary,
    low_battery_drone_ids: opsService.lowBatteryDrones().map((d) => d.drone_id),
    outside_corridor_drone_ids: opsService.outsideCorridorDrones().map((d) => d.drone_id),
    open_alerts_detail: opsService.listAlerts("open").map(alertForVoice),
  });
});

// Tool 2: get_drone_status
voiceToolsRouter.get("/drones", (req, res) => sendDrone(res, str(req.query.drone_id)));
voiceToolsRouter.get("/drones/:droneId", (req, res) => sendDrone(res, String(req.params.droneId)));

// Tool 3: get_delivery_status
voiceToolsRouter.get("/deliveries", (req, res) => sendDelivery(res, str(req.query.order_id)));
voiceToolsRouter.get("/deliveries/:orderId", (req, res) => sendDelivery(res, String(req.params.orderId)));

// Tool 4: get_open_alerts  (?status=open|acknowledged|all, default open)
voiceToolsRouter.get("/alerts", (req, res) => {
  const status = req.query.status === "acknowledged" || req.query.status === "all" ? req.query.status : "open";
  const alerts = opsService.listAlerts(status);
  res.json({ simulated: true, status, count: alerts.length, alerts: alerts.map(alertForVoice) });
});

// Tool 5: acknowledge_alert  (body: { alert_id?, acknowledged_by? })
voiceToolsRouter.post("/alerts/acknowledge", (req, res) => sendAcknowledge(res, str(req.body?.alert_id), str(req.body?.acknowledged_by)));
voiceToolsRouter.post("/alerts/:alertId/acknowledge", (req, res) => sendAcknowledge(res, String(req.params.alertId), str(req.body?.acknowledged_by)));
