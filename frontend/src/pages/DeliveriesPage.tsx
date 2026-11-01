import { DeliveryTable } from "../components/deliveries/DeliveryTable";
import { Panel } from "../components/common/ui";
import type { OpsData } from "../hooks/useOpsData";

export function DeliveriesPage({ data, onSelectDrone }: { data: OpsData; onSelectDrone: (id: string) => void }) {
  return (
    <Panel title="Delivery monitoring" subtitle="All orders in today's simulated operating window">
      <DeliveryTable deliveries={data.deliveries} onSelectDrone={onSelectDrone} />
    </Panel>
  );
}
