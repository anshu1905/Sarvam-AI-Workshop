# UAV-GPT — AI-Powered Drone Logistics Operations Control Tower

UAV-GPT is a demo operations control tower for a drone delivery company. An operations manager can watch the fleet, deliveries and flight-safety incidents on a dashboard, and ask a **Sarvam-powered voice assistant** questions such as *"Are any drones outside their corridors?"* or *"Acknowledge the alert for D-07"* — the assistant reads live data from this backend through API tools and asks for confirmation before any write.

> Everything in this project is **simulated**: the drones, deliveries, telemetry and incidents are a deterministic demo dataset around fictional Mumbai delivery sites. Nothing here represents real aircraft.

## Architecture

```
Browser (React + Vite)                         Backend (Express)                      Sarvam cloud
┌───────────────────────────┐   /api/*        ┌──────────────────────────┐
│ Dashboard (polls every 4s)│ ──────────────► │ REST API  (ops routes)   │
│ Voice panel               │                 │ In-memory data service   │◄──── API tools (HTTPS) ──┐
│  sarvam-conv-ai-sdk       │  /api/sarvam/*  │ Sarvam proxy (adds key)  │ ───► signed-URL request  │
│  (mic + speaker)          │ ──────────────► │ /api/voice-tools/* (bearer)│                       │
└───────────┬───────────────┘                 └──────────────────────────┘                        │
            │  signed WebSocket (audio in / audio + transcripts out)                               │
            └───────────────────────────────────────────────────────────────► Voice agent ◄────────┘
```

- The **frontend** never sees the Sarvam API key. The Web SDK is pointed at `/api/sarvam/`; the backend proxy adds the key and forwards the SDK's signed-URL request to `https://apps.sarvam.ai/api/app-runtime/…`. The returned WebSocket URL is single-use and opened directly by the browser.
- The **voice agent** gets fleet data by calling the backend's `/api/voice-tools/*` endpoints (protected by a shared bearer secret), which use the same in-memory service as the dashboard. When the agent acknowledges an incident, the dashboard reflects it within a few seconds without a reload.

## Tech stack

- Frontend: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide icons, Recharts (one battery chart), `sarvam-conv-ai-sdk`
- Backend: Node.js 20+, Express 5, TypeScript, in-memory JSON data store
- Tooling: npm workspaces, `concurrently` for the single dev command

## Project structure

```
uav-gpt/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/        TopNav, shared UI primitives
│   │   │   ├── dashboard/     KPI cards
│   │   │   ├── fleet/         Schematic map, fleet table, drone detail panel
│   │   │   ├── deliveries/    Delivery table
│   │   │   ├── incidents/     Incident panel with acknowledge
│   │   │   └── voice/         UAVGPTVoiceAgent floating panel
│   │   ├── hooks/             useOpsData (polling), useSarvamAgent (SDK lifecycle)
│   │   ├── services/api.ts    fetch wrappers
│   │   ├── types/             shared domain types
│   │   ├── pages/             Overview, Fleet, Deliveries, Incidents
│   │   └── App.tsx
│   └── package.json
├── backend/
│   ├── src/
│   │   ├── routes/            ops.ts, voiceTools.ts, voiceConfig.ts, sarvamProxy.ts
│   │   ├── services/          opsService.ts (all data access)
│   │   ├── data/              demoData.ts (simulated dataset)
│   │   ├── middleware/        toolAuth.ts (bearer secret)
│   │   ├── config/            env.ts
│   │   └── server.ts
│   └── package.json
├── docs/
│   ├── SARVAM_AGENT_PROMPT.md System prompt for the Sarvam agent
│   └── SARVAM_TOOL_SETUP.md   API tool definitions, tunnel/deploy steps, curl tests
├── .env.example
├── package.json               workspace root: npm run dev / build / start
└── README.md
```

## Installation

Requires Node.js 20 or newer.

```bash
npm install
```

```bash
cp .env.example .env
```

## Environment variables

| Variable | Required for | Description |
|---|---|---|
| `SARVAM_API_KEY` | Live voice | **Voice Agents** API key (Voice Agents dashboard → Settings → API Key). Server-side only; added by the proxy. The Model-API subscription key (`sk_…`) is a different key and is rejected with `401 Invalid API key format`. |
| `SARVAM_ORG_ID` | Live voice | Org id of the voice agent (non-secret, sent to the browser). |
| `SARVAM_WORKSPACE_ID` | Live voice | Workspace id of the voice agent. |
| `SARVAM_APP_ID` | Live voice | App id of the voice agent. |
| `SARVAM_AGENT_VERSION` | optional | Pin a committed agent version (number). Defaults to latest. |
| `SARVAM_TOOL_SHARED_SECRET` | Agent tools | Bearer secret Sarvam's API tools must send to `/api/voice-tools/*`. `openssl rand -hex 32` |
| `PORT` | optional | Backend port (default 3001). |
| `NODE_ENV` | optional | `production` makes the backend serve `frontend/dist` with caching. |

The backend loads `.env` from the repository root (and `backend/.env` if present). Hosting platforms set these in their own environment settings.

**Without the Sarvam variables the dashboard still runs fully.** The voice panel shows "Live voice is not configured" with the names of the missing variables instead of pretending to connect.

## Running the application

Development (backend on :3001 with hot reload, Vite on :5173 proxying `/api`):

```bash
npm run dev
```

Open http://localhost:5173.

Production build and single-process start (backend serves the built frontend on :3001):

```bash
npm run build
```

```bash
npm start
```

Type-check both packages:

```bash
npm run typecheck
```

## Setting up a Sarvam Voice Agent

1. Sign in at https://dashboard.sarvam.ai, open **Voice Agents → Settings → API Key** and create a key (`SARVAM_API_KEY`). This is not the same as the Model-API `sk_…` subscription key.
2. Create a **Voice Agent** named UAV-GPT. Paste the prompt from [docs/SARVAM_AGENT_PROMPT.md](docs/SARVAM_AGENT_PROMPT.md) as its instructions and enable the languages you want to demo (English, Hindi, …).
3. Add the five API tools following [docs/SARVAM_TOOL_SETUP.md](docs/SARVAM_TOOL_SETUP.md).
4. Commit / publish a version of the agent.
5. Copy the agent's org, workspace and app ids into `.env`, generate `SARVAM_TOOL_SHARED_SECRET`, and restart `npm run dev`.

### Configuring the shared bearer secret

```bash
openssl rand -hex 32
```

Put the value in `.env` as `SARVAM_TOOL_SHARED_SECRET` **and** in every tool's `Authorization: Bearer …` header in the Sarvam dashboard. The backend compares it in constant time; with no secret set the tool routes return `503` rather than opening up.

### Connecting an HTTPS endpoint for Sarvam's tool calls

Sarvam's cloud cannot reach `localhost`. For a demo, open a tunnel and use its URL in the tool definitions:

```bash
cloudflared tunnel --url http://localhost:3001
```

For production, deploy the repository (see *Deploying*) and use the public URL. Details and `curl` checks are in [docs/SARVAM_TOOL_SETUP.md](docs/SARVAM_TOOL_SETUP.md).

## Testing the voice interaction

1. Start the app, open the dashboard and click **UAV-GPT assistant** (bottom right).
2. Optionally choose a language (it must be enabled on the agent), then click **Start conversation**. The browser asks for microphone permission only at this point.
3. The status pill goes *Connecting → Live*; the panel shows *Listening* / *UAV-GPT is speaking* and the running transcript.
4. Demo script:
   - "Give me the current fleet summary." → 8 drones, 12 active deliveries, 2 delayed, 2 open alerts.
   - "Are any drones outside their assigned corridors?" → D-07, 18 m deviation (highlighted on the map and in Incidents).
   - "Tell me more about D-07." → battery 42 %, altitude 58 m, 34 km/h, ORD-1042, ETA 7 min.
   - "Acknowledge the alert for D-07." → the agent asks for confirmation; say "Yes, acknowledge it." INC-001 flips to acknowledged on the dashboard within ~4 s.
   - "Which drones have low battery?" → D-09 at 21 %.
5. **Mute** sends silence to the agent; **Stop conversation** closes the socket and releases the microphone. Each start creates a fresh session (signed URLs are single-use).

## Deploying

The repo is a plain Node project: `npm install && npm run build` then `npm start`, with the environment variables above. On Render/Railway/Fly: build command `npm install && npm run build`, start command `npm start`, set `NODE_ENV=production` and `PORT` if the platform requires one. The backend serves the SPA and the API from one origin, so no CORS configuration is needed. The site must be served over **HTTPS** for the browser to grant microphone access (platforms do this for you).

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Panel says *Live voice is not configured* | One of `SARVAM_API_KEY`, `SARVAM_ORG_ID`, `SARVAM_WORKSPACE_ID`, `SARVAM_APP_ID` is empty. Set it and restart the backend; `GET /api/voice/config` lists what is missing. |
| *Microphone access was denied* | Allow the mic in the browser's site settings. Microphone access also requires HTTPS or `localhost`. |
| *No microphone was found* / *in use by another application* | Check the OS input device; close other apps using it. |
| *Sarvam rejected the server's API key* (401, backend log shows `Invalid API key format`) | `SARVAM_API_KEY` is a Model-API `sk_…` key. Create a **Voice Agents** API key (Voice Agents → Settings → API Key) instead. Otherwise the key is wrong or revoked. |
| *Agent not found* (404) | Wrong org/workspace/app id, or the agent has no committed version. |
| *Connection timed out* | Backend not running, `/api` proxy not reaching it, or Sarvam unreachable. Check the backend log for `[sarvam-proxy]` lines. |
| Agent answers "information is unavailable" | Its API tools cannot reach the backend: tunnel down, wrong URL in the dashboard, or bearer secret mismatch (`401`) / not configured (`503`). Test with the `curl` commands in the tool setup doc. |
| Audio is choppy | Keep sample rates at 16000/16000 (as configured); avoid Bluetooth headsets with aggressive echo cancellation. |
| *Session ended* right after connecting | The agent hung up (e.g. end-of-call rule) or the network dropped. Click Start again — a new agent instance is created each time. |

## Safety notes

UAV-GPT is decision support only. The backend exposes no flight-control endpoints; the only write operation is acknowledging an incident, which is idempotent and, by voice, always preceded by an explicit confirmation question.
