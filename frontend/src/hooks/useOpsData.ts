import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../services/api";
import type { Alert, Delivery, Drone, OpsSummary } from "../types";

const POLL_INTERVAL_MS = 4000;

export interface OpsData {
  summary: OpsSummary | null;
  drones: Drone[];
  deliveries: Delivery[];
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  backendOnline: boolean;
  refresh: () => Promise<void>;
  acknowledge: (alertId: string) => Promise<void>;
}

/**
 * Single source of truth for dashboard data. Polls the backend so changes made
 * elsewhere (e.g. the voice agent acknowledging an alert) appear without a reload.
 */
export function useOpsData(): OpsData {
  const [summary, setSummary] = useState<OpsSummary | null>(null);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const [s, d, o, a] = await Promise.all([api.summary(), api.drones(), api.deliveries(), api.alerts()]);
      setSummary(s);
      setDrones(d);
      setDeliveries(o);
      setAlerts(a);
      setError(null);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reach backend");
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  const acknowledge = useCallback(
    async (alertId: string) => {
      const updated = await api.acknowledgeAlert(alertId);
      setAlerts((prev) => prev.map((a) => (a.alert_id === updated.alert_id ? updated : a)));
      await refresh();
    },
    [refresh],
  );

  return { summary, drones, deliveries, alerts, loading, error, lastUpdated, backendOnline: error === null, refresh, acknowledge };
}
