import { useNavigate, useParams } from 'react-router-dom';
import { useReviewSummary } from '@/api/reviews';
import { useTrips } from '@/api/trips';
import type { CatalogDocument, TripItem } from '@/api/types';
import { useVehicle, useVehicleMetadata } from '@/api/vehicles';
import { Badge, TripStatusBadge } from '@/components/Badge';
import { ButtonLink } from '@/components/Button';
import { Card, StatCard, StatGrid } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { RelativeTime } from '@/components/RelativeTime';
import { QueryState } from '@/components/StateView';
import { usePageTitle } from '@/context/PageTitleContext';
import { formatDateTime, formatDay, formatMoney, formatNumber, formatRating } from '@/lib/format';
import { AverageRating, RatingDistribution, TopTags } from '../reviews/ReviewSummaryWidgets';
import page from '../page.module.css';
import { VehicleCatalogCard } from './VehicleCatalogCard';

const tripColumns: Column<TripItem>[] = [
  { key: 'created', header: 'Created', sorted: 'desc', render: (t) => formatDateTime(t.created_at) },
  { key: 'rider', header: 'Rider', render: (t) => t.rider.name },
  { key: 'fare', header: 'Fare', align: 'right', render: (t) => formatMoney(t.fare_amount) },
  { key: 'status', header: 'Status', render: (t) => <TripStatusBadge status={t.status} /> },
];

/** Latest inspection from the flexible catalog document, if it has one. */
function lastInspection(doc: CatalogDocument | null | undefined): { date: string; passed: boolean } | null {
  const records = doc?.inspection_records;
  if (!Array.isArray(records)) return null;
  const valid = records.flatMap((r: unknown) => {
    if (typeof r !== 'object' || r === null) return [];
    const rec = r as Record<string, unknown>;
    return typeof rec.inspected_at === 'string' && typeof rec.passed === 'boolean'
      ? [{ inspected_at: rec.inspected_at, passed: rec.passed }]
      : [];
  });
  if (!valid.length) return null;
  const latest = valid.reduce((a, b) => (a.inspected_at > b.inspected_at ? a : b));
  return { date: latest.inspected_at, passed: latest.passed };
}

export default function VehicleDetailPage() {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const vehicle = useVehicle(vehicleId);
  const metadata = useVehicleMetadata(vehicleId);
  const reviews = useReviewSummary(vehicleId);
  const trips = useTrips({ vehicle_id: vehicleId, page_size: 5 }, Boolean(vehicleId));
  usePageTitle(vehicle.data?.license_plate ?? 'Vehicle', { label: 'Vehicles', to: '/vehicles' });
  const inspection = lastInspection(metadata.data);

  return (
    <QueryState query={vehicle} errorTitle="Could not load this vehicle">
      {(v) => (
        <div className={page.page}>
          <div className={page.headerRow}>
            <Badge>{v.vehicle_class}</Badge>
            <Badge tone={v.is_active ? 'success' : 'neutral'}>{v.is_active ? 'Active' : 'Out of service'}</Badge>
            <span className={page.mono}>{v.id}</span>
            <span className={page.push} />
            <ButtonLink to={`/analytics?vehicle=${v.id}`}>Revenue trend</ButtonLink>
            <ButtonLink to={`/reviews?vehicle=${v.id}`}>All reviews</ButtonLink>
          </div>
          <StatGrid>
            <StatCard
              label="Lifetime trips"
              value={formatNumber(v.lifetime_trip_count)}
              sub={v.stats_as_of ? <>completed {'·'} as of <RelativeTime iso={v.stats_as_of} intervalMs={30_000} /></> : 'completed'}
            />
            <StatCard
              label="Total earnings"
              value={formatMoney(v.total_earnings)}
              sub={v.revenue_rank ? `rank #${v.revenue_rank} of ${formatNumber(v.ranked_vehicles)}` : 'not ranked yet'}
            />
            <StatCard
              label="Average rating"
              loading={reviews.isPending}
              value={reviews.data?.overall_average != null ? `${formatRating(reviews.data.overall_average)} ★` : '—'}
              sub={reviews.data ? `${formatNumber(reviews.data.total)} reviews` : reviews.isError ? 'MongoDB unavailable' : undefined}
            />
            <StatCard
              label="Last inspection"
              loading={metadata.isPending}
              value={inspection ? (inspection.passed ? 'Passed' : 'Failed') : '—'}
              sub={inspection ? formatDay(inspection.date) : metadata.isError ? 'MongoDB unavailable' : 'no records'}
            />
          </StatGrid>
          <div className={page.twoCol}>
            <VehicleCatalogCard vehicleId={v.id} />
            <Card title="Reviews" subtitle="TripReviews $facet for this vehicle">
              <QueryState
                query={reviews}
                isEmpty={(s) => s.total === 0}
                empty={{ title: 'No reviews yet' }}
                errorTitle="Reviews unavailable"
              >
                {(s) => (
                  <div className={page.stack}>
                    <AverageRating summary={s} />
                    <RatingDistribution summary={s} />
                    <TopTags summary={s} />
                  </div>
                )}
              </QueryState>
            </Card>
          </div>
          <Card title="Recent trips" actions={<ButtonLink size="sm" to={`/trips?vehicle=${v.id}`}>All trips</ButtonLink>}>
            <QueryState query={trips} isEmpty={(d) => d.items.length === 0} empty={{ title: 'No trips for this vehicle' }}>
              {(d) => (
                <DataTable
                  caption="Recent trips for this vehicle"
                  columns={tripColumns}
                  rows={d.items}
                  rowKey={(t) => t.id}
                  onRowClick={(t) => navigate(`/trips/${t.id}`)}
                />
              )}
            </QueryState>
          </Card>
        </div>
      )}
    </QueryState>
  );
}
