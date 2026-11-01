# UAV-GPT — Sarvam API Tool Setup

This document describes the five API tools the UAV-GPT voice agent uses, how to expose the backend so Sarvam's cloud can reach them, and how to configure the tools in the Sarvam dashboard.

All tool endpoints live under `/api/voice-tools/` on the UAV-GPT backend and share the same in-memory data service as the dashboard, so anything the agent reads or acknowledges is immediately visible in the UI (the dashboard polls every 4 seconds).

## 1. Authentication (all tools)

Every request must carry the shared secret as a bearer token:

```http
Authorization: Bearer <SARVAM_TOOL_SHARED_SECRET>
```

- Generate a secret: `openssl rand -hex 32`
- Set it as `SARVAM_TOOL_SHARED_SECRET` in the backend environment.
- With no secret configured the routes answer `503` (they are never open). A wrong or missing token answers `401`.

In the Sarvam tool editor, set **Auth** to **bearer token** and enter the secret through the secure (masked) input — it is stored as a workspace secret and referenced by the tool, not written into the tool definition. Treat it like a password: rotate it if it leaks.

Tool calls come from Sarvam's servers; if your backend sits behind a firewall, allowlist `4.213.167.70` and `35.154.84.150` (from the Sarvam API-tool docs).

## 2. Reaching the backend from Sarvam's cloud

Sarvam calls your tool endpoints from its own servers, so `http://localhost:3001` is **not** reachable. Pick one:

### Option A — HTTPS tunnel to your laptop (fastest for a workshop demo)

```bash
# Cloudflare (no account needed for a quick tunnel)
brew install cloudflared
cloudflared tunnel --url http://localhost:3001
```

or

```bash
# ngrok (needs a free account + authtoken)
ngrok http 3001
```

Either prints a public `https://…` URL. Use that as `<BASE>` below. Quick tunnels change their URL on every restart, so update the tool URLs in the dashboard when you restart the tunnel.

### Option B — Deploy the backend (production)

Deploy the repository to any Node host (Render, Railway, Fly.io, a VM). The backend serves the built frontend as well, so one service is enough. Set the environment variables from `.env.example`, then use `https://<your-domain>` as `<BASE>`.

## 3. Tool definitions

Replace `<BASE>` with your public HTTPS origin. Example responses are from the simulated dataset; every payload carries `"simulated": true`.

### Tool 1 — `get_ops_summary`

Fleet-wide status: counts, health, and the lists of low-battery / outside-corridor drones and open alerts.

| | |
|---|---|
| Method | `GET` |
| URL | `<BASE>/api/voice-tools/ops-summary` |
| Path params | none |
| Query params | none |
| Body | none |
| Auth | `Authorization: Bearer <secret>` |

Example response:

```json
{
  "active_drones": 8,
  "active_deliveries": 12,
  "delayed_deliveries": 2,
  "open_alerts": 2,
  "fleet_health": "ATTENTION_REQUIRED",
  "simulated": true,
  "generated_at": "2026-11-01T10:30:00.000Z",
  "low_battery_drone_ids": ["D-09"],
  "outside_corridor_drone_ids": ["D-07"],
  "open_alerts_detail": [
    { "alert_id": "INC-001", "drone_id": "D-07", "category": "CORRIDOR_DEPARTURE", "severity": "HIGH", "description": "D-07 departed its assigned Powai–Dadar corridor by 18 m. …", "acknowledged": false, "acknowledged_by": null },
    { "alert_id": "INC-002", "drone_id": "D-09", "category": "LOW_BATTERY", "severity": "MEDIUM", "description": "D-09 battery at 21% …", "acknowledged": false, "acknowledged_by": null }
  ]
}
```

### Tool 2 — `get_drone_status`

| | |
|---|---|
| Method | `GET` |
| URL | `<BASE>/api/voice-tools/drones/{drone_id}` — or, if the editor cannot template path segments, `<BASE>/api/voice-tools/drones` with query param `drone_id` |
| Path / query params | `drone_id` (string, e.g. `D-07`; case-insensitive) |
| Body | none |
| Auth | `Authorization: Bearer <secret>` |

Tool parameter to declare in Sarvam: `drone_id` — string, required — "Drone identifier such as D-07". Put it in **Params** (query form) or in the URL path (path form); both are accepted.

Example response (`GET /api/voice-tools/drones/D-07`):

```json
{
  "simulated": true,
  "drone_id": "D-07",
  "flight_status": "FLYING",
  "battery_percent": 42,
  "low_battery": false,
  "altitude_m": 58,
  "speed_kmh": 34,
  "corridor_status": "OUTSIDE_CORRIDOR",
  "corridor_deviation_m": 18,
  "active_order_id": "ORD-1042",
  "eta_minutes": 7,
  "route": "Powai Fulfilment Centre to Dadar",
  "open_alert_ids": ["INC-001"]
}
```

Unknown drone → `404 { "error": "No drone with id D-42", "known_drone_ids": ["D-01", …] }`.

### Tool 3 — `get_delivery_status`

| | |
|---|---|
| Method | `GET` |
| URL | `<BASE>/api/voice-tools/deliveries/{order_id}` — or `<BASE>/api/voice-tools/deliveries` with query param `order_id` |
| Path / query params | `order_id` (string, e.g. `ORD-1042`; case-insensitive) |
| Body | none |
| Auth | `Authorization: Bearer <secret>` |

Tool parameter: `order_id` — string, required — "Order identifier such as ORD-1042".

Example response:

```json
{
  "simulated": true,
  "order_id": "ORD-1042",
  "status": "IN_TRANSIT",
  "assigned_drone_id": "D-07",
  "origin": "Powai Fulfilment Centre",
  "destination": "Dadar",
  "eta_minutes": 7,
  "priority": "CRITICAL",
  "payload": "Medical supplies (2.6 kg)",
  "note": "Drone outside corridor — see INC-001"
}
```

### Tool 4 — `get_open_alerts`

| | |
|---|---|
| Method | `GET` |
| URL | `<BASE>/api/voice-tools/alerts?status=open` |
| Query params | `status` — `open` (default), `acknowledged` or `all` |
| Body | none |
| Auth | `Authorization: Bearer <secret>` |

Example response:

```json
{
  "simulated": true,
  "status": "open",
  "count": 2,
  "alerts": [
    { "alert_id": "INC-001", "drone_id": "D-07", "category": "CORRIDOR_DEPARTURE", "severity": "HIGH", "description": "…", "created_at": "2026-11-01T10:24:00.000Z", "acknowledged": false, "acknowledged_by": null },
    { "alert_id": "INC-002", "drone_id": "D-09", "category": "LOW_BATTERY", "severity": "MEDIUM", "description": "…", "created_at": "2026-11-01T10:19:00.000Z", "acknowledged": false, "acknowledged_by": null }
  ]
}
```

### Tool 5 — `acknowledge_alert`  (write — needs operator confirmation)

| | |
|---|---|
| Method | `POST` |
| URL | `<BASE>/api/voice-tools/alerts/{alert_id}/acknowledge` — or `<BASE>/api/voice-tools/alerts/acknowledge` with `alert_id` in the JSON body |
| Path params | `alert_id` (string, e.g. `INC-001`) |
| Headers | `Content-Type: application/json`, `Authorization: Bearer <secret>` |
| Body | `{ "alert_id": "INC-001", "acknowledged_by": "Operations Manager" }` (`alert_id` only needed in the body form) |

Tool parameters: `alert_id` — string, required; `acknowledged_by` — string, optional (default `Operations Manager (via UAV-GPT voice)`).

The call is idempotent: acknowledging twice returns the same record. The system prompt instructs the agent to ask "Are you sure you want to acknowledge incident INC-001 for drone D-07?" before calling this tool.

Example response:

```json
{
  "simulated": true,
  "result": "acknowledged",
  "alert_id": "INC-001",
  "drone_id": "D-07",
  "category": "CORRIDOR_DEPARTURE",
  "severity": "HIGH",
  "description": "…",
  "created_at": "2026-11-01T10:24:00.000Z",
  "acknowledged": true,
  "acknowledged_by": "Operations Manager"
}
```

## 4. Configuring the tools in the Sarvam dashboard

1. Open https://dashboard.sarvam.ai → **Voice Agents** → create (or open) the **UAV-GPT** agent.
2. Paste the contents of `docs/SARVAM_AGENT_PROMPT.md` (below the horizontal rule) as the agent's system prompt / instructions.
3. Enable the languages you want (English, Hindi, …) in the agent's language settings. The voice panel's language selector only works for languages enabled here.
4. Under **Tools → API tool**, add the five tools above. For each one:
   - **Name** exactly as listed (`get_ops_summary`, `get_drone_status`, `get_delivery_status`, `get_open_alerts`, `acknowledge_alert`) — the system prompt refers to these names as `call tool:<name>`.
   - **Description**: one clear line, e.g. "Returns the current fleet summary with counts, low-battery drones, corridor departures and open alerts." The agent picks tools by name + description.
   - **When should this tool run?** → `run` (during conversation).
   - **Method**, **URL**, **Params** / path, **Body** as in the tables. Tip: the editor can import a cURL command — paste one of the `curl` lines from section 5 with your tunnel URL, then adjust.
   - **Auth** → bearer token, secret entered in the secure input.
   - **Response template** (optional): e.g. for `get_drone_status`: `Drone {{drone_id}} is {{flight_status}} with {{battery_percent}} percent battery, {{corridor_status}} with a deviation of {{corridor_deviation_m}} metres, carrying {{active_order_id}}, ETA {{eta_minutes}} minutes.` Type `@` to pick fields from a test response.
   - **Advanced → Max wait**: 10 s is plenty for this backend. **If it fails**: "I can't reach the operations system right now; please check the dashboard."
   - Enable the tool on the agent.
5. Save and **commit / publish** a version of the agent. The Web SDK connects to the latest committed version (or the one pinned by `SARVAM_AGENT_VERSION`).
6. Copy the agent's **org id**, **workspace id** and **app id** (from the agent's deploy / Web SDK snippet) into the backend environment (`SARVAM_ORG_ID`, `SARVAM_WORKSPACE_ID`, `SARVAM_APP_ID`) and restart the backend.

Use a **Voice Agents API key** (Voice Agents dashboard → Settings → API Key) for `SARVAM_API_KEY`. The Model-API subscription key (`sk_…`) is rejected by the voice runtime with `401 Invalid API key format`.

## 5. Testing the tools without the agent

```bash
export SECRET=$(grep SARVAM_TOOL_SHARED_SECRET .env | cut -d= -f2)
```

```bash
curl -s -H "Authorization: Bearer $SECRET" http://localhost:3001/api/voice-tools/ops-summary | jq
```

```bash
curl -s -H "Authorization: Bearer $SECRET" http://localhost:3001/api/voice-tools/drones/D-07 | jq
```

```bash
curl -s -X POST -H "Authorization: Bearer $SECRET" -H "Content-Type: application/json" -d '{"acknowledged_by":"Ops Manager"}' http://localhost:3001/api/voice-tools/alerts/INC-001/acknowledge | jq
```

Replace `http://localhost:3001` with your tunnel URL to verify that Sarvam's cloud will be able to reach the backend. A `401` means the secret in the dashboard does not match the backend; a `503` means the backend has no secret configured.
