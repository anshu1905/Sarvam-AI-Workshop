import { useState } from "react";
import { WifiOff } from "lucide-react";
import { TopNav, type Page } from "./components/common/TopNav";
import { DroneDetailPanel } from "./components/fleet/DroneDetailPanel";
import { UAVGPTVoiceAgent } from "./components/voice/UAVGPTVoiceAgent";
import { useOpsData } from "./hooks/useOpsData";
import { OverviewPage } from "./pages/OverviewPage";
import { FleetPage } from "./pages/FleetPage";
import { DeliveriesPage } from "./pages/DeliveriesPage";
import { IncidentsPage } from "./pages/IncidentsPage";

export default function App() {
  const [page, setPage] = useState<Page>("overview");
  const [selectedDroneId, setSelectedDroneId] = useState<string | null>(null);
  const data = useOpsData();
  const selectedDrone = selectedDroneId ? data.drones.find((d) => d.drone_id === selectedDroneId) ?? null : null;

  return (
    <div className="min-h-full">
      <TopNav page={page} onNavigate={setPage} health={data.summary?.fleet_health ?? null} backendOnline={data.backendOnline} />

      <main className="mx-auto max-w-[1600px] px-4 pb-28 pt-[4.5rem] md:pt-[4.5rem] lg:px-6 max-md:pt-[6.5rem]">
        {data.error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            <WifiOff size={16} /> Backend unreachable: {data.error}. Retrying automatically.
          </div>
        )}
        {data.loading && !data.summary ? (
          <div className="py-24 text-center text-sm text-slate-400">Loading operational data…</div>
        ) : (
          <>
            {page === "overview" && <OverviewPage data={data} selectedDroneId={selectedDroneId} onSelectDrone={setSelectedDroneId} />}
            {page === "fleet" && <FleetPage data={data} selectedDroneId={selectedDroneId} onSelectDrone={setSelectedDroneId} />}
            {page === "deliveries" && <DeliveriesPage data={data} onSelectDrone={setSelectedDroneId} />}
            {page === "incidents" && <IncidentsPage data={data} selectedDroneId={selectedDroneId} onSelectDrone={setSelectedDroneId} />}
          </>
        )}
        <footer className="mt-8 text-[11px] text-slate-500">
          UAV-GPT demo · All telemetry, orders and incidents are simulated. Last data refresh: {data.lastUpdated ? data.lastUpdated.toLocaleTimeString() : "—"}.
        </footer>
      </main>

      {selectedDrone && (
        <DroneDetailPanel drone={selectedDrone} deliveries={data.deliveries} alerts={data.alerts} onClose={() => setSelectedDroneId(null)} onAcknowledge={data.acknowledge} />
      )}

      <UAVGPTVoiceAgent onDataChanged={data.refresh} />
    </div>
  );
}
