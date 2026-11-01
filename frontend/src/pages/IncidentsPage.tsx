import { IncidentPanel } from "../components/incidents/IncidentPanel";
import { Panel } from "../components/common/ui";
import type { OpsData } from "../hooks/useOpsData";

export function IncidentsPage({ data, selectedDroneId, onSelectDrone }: { data: OpsData; selectedDroneId: string | null; onSelectDrone: (id: string) => void }) {
  return (
    <Panel title="Incident monitoring" subtitle="Acknowledging an incident records that an operator has seen it. It does not change any flight plan.">
      <IncidentPanel alerts={data.alerts} onAcknowledge={data.acknowledge} onSelectDrone={onSelectDrone} highlightDroneId={selectedDroneId} />
    </Panel>
  );
}
