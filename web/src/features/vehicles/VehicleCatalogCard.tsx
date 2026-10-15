import { useVehicleMetadata } from '@/api/vehicles';
import { Card } from '@/components/Card';
import { QueryState } from '@/components/StateView';
import { CatalogDocument } from './CatalogDocument';

/** The VehicleMetadata document for one vehicle (MongoDB). */
export function VehicleCatalogCard({ vehicleId, title = 'Catalog' }: { vehicleId: string; title?: string }) {
  const metadata = useVehicleMetadata(vehicleId);
  return (
    <Card title={title} subtitle="VehicleMetadata document (MongoDB)">
      <QueryState
        query={metadata}
        isEmpty={(doc) => doc === null}
        empty={{ title: 'No catalog document', text: 'This vehicle has no VehicleMetadata document yet.' }}
        errorTitle="Catalog unavailable"
      >
        {(doc) => (doc ? <CatalogDocument doc={doc} /> : null)}
      </QueryState>
    </Card>
  );
}
