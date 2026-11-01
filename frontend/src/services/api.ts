import type { Alert, Delivery, Drone, OpsSummary, VoiceConfig } from "../types";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...init });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // non-JSON error body
    }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),
  summary: () => request<OpsSummary>("/api/ops/summary"),
  drones: () => request<Drone[]>("/api/drones"),
  drone: (id: string) => request<Drone>(`/api/drones/${encodeURIComponent(id)}`),
  deliveries: () => request<Delivery[]>("/api/deliveries"),
  alerts: () => request<Alert[]>("/api/alerts"),
  acknowledgeAlert: (id: string, acknowledgedBy = "Operations Manager") =>
    request<Alert>(`/api/alerts/${encodeURIComponent(id)}/acknowledge`, {
      method: "POST",
      body: JSON.stringify({ acknowledged_by: acknowledgedBy }),
    }),
  voiceConfig: () => request<VoiceConfig>("/api/voice/config"),
};
