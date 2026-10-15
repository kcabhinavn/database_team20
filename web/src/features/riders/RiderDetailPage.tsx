import { useNavigate, useParams } from 'react-router-dom';
import { useRider } from '@/api/riders';
import type { TripItem } from '@/api/types';
import { TripStatusBadge } from '@/components/Badge';
import { Button, ButtonLink } from '@/components/Button';
import { Card, StatCard, StatGrid } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { EmptyState, QueryState } from '@/components/StateView';
import { useActor } from '@/context/ActorContext';
import { usePageTitle } from '@/context/PageTitleContext';
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format';
import { TRIP_STATUS_LABEL } from '@/lib/statuses';
import { TripStatusCard } from '../trips/TripStatusCard';
import page from '../page.module.css';

const tripColumns: Column<TripItem>[] = [
  { key: 'created', header: 'Created', sorted: 'desc', render: (t) => formatDateTime(t.created_at) },
  { key: 'vehicle', header: 'Vehicle', render: (t) => <span className={page.strong}>{t.vehicle.license_plate}</span> },
  { key: 'fare', header: 'Fare', align: 'right', render: (t) => formatMoney(t.fare_amount) },
  { key: 'status', header: 'Status', render: (t) => <TripStatusBadge status={t.status} /> },
];

export default function RiderDetailPage() {
  const { riderId } = useParams();
  const rider = useRider(riderId);
  const { setRole, setRiderId } = useActor();
  const navigate = useNavigate();
  usePageTitle(rider.data?.name ?? 'Rider', { label: 'Riders', to: '/riders' });

  const actAs = (id: string) => {
    setRiderId(id);
    setRole('rider');
    navigate('/book');
  };

  return (
    <QueryState query={rider} errorTitle="Could not load this rider">
      {(data) => (
        <div className={page.page}>
          <div className={page.headerRow}>
            <Button variant="primary" onClick={() => actAs(data.id)}>
              Act as this rider
            </Button>
            <ButtonLink to={`/wallet?rider=${data.id}`}>Wallet audit</ButtonLink>
            <ButtonLink to={`/trips?rider=${data.id}`}>All trips</ButtonLink>
          </div>
          <StatGrid>
            <StatCard label="Wallet balance" value={formatMoney(data.wallet_balance)} />
            <StatCard label="Active trip" value={data.active_trip ? TRIP_STATUS_LABEL[data.active_trip.status] : 'None'} sub="at most one at a time" />
            <StatCard label="Wallet audit entries" value={formatNumber(data.audit_entries)} sub="append-only log" />
          </StatGrid>
          <div className={page.twoCol}>
            <Card title="Recent trips" subtitle="Newest first">
              {data.recent_trips.length ? (
                <DataTable
                  caption="Recent trips"
                  columns={tripColumns}
                  rows={data.recent_trips}
                  rowKey={(t) => t.id}
                  onRowClick={(t) => navigate(`/trips/${t.id}`)}
                />
              ) : (
                <EmptyState title="No trips yet" />
              )}
            </Card>
            {data.active_trip ? (
              <TripStatusCard trip={data.active_trip} title="Active trip" showLink />
            ) : (
              <Card title="Active trip">
                <EmptyState title="No active trip">This rider can book a new trip.</EmptyState>
              </Card>
            )}
          </div>
        </div>
      )}
    </QueryState>
  );
}
