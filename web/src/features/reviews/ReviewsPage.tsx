import { useReviewSummary } from '@/api/reviews';
import { useVehicle } from '@/api/vehicles';
import { Card } from '@/components/Card';
import { Combobox, type ComboOption } from '@/components/Combobox';
import { SegmentedControl } from '@/components/SegmentedControl';
import { EmptyState, QueryState, Skeleton } from '@/components/StateView';
import { usePageTitle } from '@/context/PageTitleContext';
import { useUrlState } from '@/hooks/useUrlState';
import { formatNumber } from '@/lib/format';
import { VehicleCatalogCard } from '../vehicles/VehicleCatalogCard';
import { loadVehicleOptions } from '../vehicles/vehicleOptions';
import page from '../page.module.css';
import { RecentReviews } from './RecentReviews';
import { AverageRating, RatingDistribution, TopTags } from './ReviewSummaryWidgets';
import styles from './ReviewsPage.module.css';

type Scope = 'all' | 'one';

/** Workflow 4: one $facet call feeds the average, the distribution and the top tags. */
export default function ReviewsPage() {
  usePageTitle('Reviews');
  const url = useUrlState();
  const vehicleId = url.get('vehicle');
  const scope: Scope = url.get('scope') === 'one' || vehicleId ? 'one' : 'all';
  const scopedId = scope === 'one' ? vehicleId : null;
  const vehicle = useVehicle(vehicleId);
  const summary = useReviewSummary(scopedId);

  const vehicleValue: ComboOption | null = vehicle.data
    ? { id: vehicle.data.id, label: vehicle.data.license_plate, meta: vehicle.data.vehicle_class }
    : null;
  const waitingForVehicle = scope === 'one' && !vehicleId;

  return (
    <div className={page.page}>
      <div className={page.toolbar}>
        <SegmentedControl<Scope>
          label="Scope"
          options={[
            { value: 'all', label: 'All vehicles' },
            { value: 'one', label: 'One vehicle' },
          ]}
          value={scope}
          onChange={(next) => url.set(next === 'all' ? { scope: null, vehicle: null } : { scope: 'one' })}
        />
        {scope === 'one' ? (
          <Combobox
            label="Vehicle"
            hideLabel
            queryKey="vehicles"
            loadOptions={loadVehicleOptions}
            value={vehicleValue}
            onChange={(o) => url.set({ scope: 'one', vehicle: o.id })}
            placeholder="Choose a vehicle…"
            className={page.grow}
          />
        ) : null}
        {summary.data ? (
          <span className={[page.meta, page.push].join(' ')}>
            {formatNumber(summary.data.total)} reviews {'·'} rating {'≥'} 1
          </span>
        ) : null}
      </div>

      {waitingForVehicle ? (
        <Card>
          <EmptyState title="Choose a vehicle">Pick a vehicle above to see its reviews and catalog document.</EmptyState>
        </Card>
      ) : (
        <QueryState
          query={summary}
          errorTitle="Reviews unavailable"
          loading={<Skeleton lines={6} label="Loading review summary" />}
          isEmpty={(s) => s.total === 0}
          empty={{ title: 'No reviews yet', text: 'This vehicle has not been reviewed.' }}
        >
          {(s) => (
            <div className={page.threeCol}>
              <Card title="Average rating">
                <AverageRating summary={s} />
              </Card>
              <Card title="Rating distribution">
                <RatingDistribution summary={s} />
              </Card>
              <Card title="Top feedback tags">
                <TopTags summary={s} />
              </Card>
            </div>
          )}
        </QueryState>
      )}

      <div className={styles.lower}>
        {waitingForVehicle ? null : <RecentReviews key={scopedId ?? 'all'} vehicleId={scopedId} />}
        {scopedId ? (
          <VehicleCatalogCard vehicleId={scopedId} title={`Vehicle catalog${vehicle.data ? `: ${vehicle.data.license_plate}` : ''}`} />
        ) : (
          <Card title="Vehicle catalog" subtitle="VehicleMetadata document (MongoDB)">
            <EmptyState title="Choose one vehicle to see its catalog">
              Switch the scope to One vehicle and pick a vehicle. Its features and inspection history appear here.
            </EmptyState>
          </Card>
        )}
      </div>
    </div>
  );
}
