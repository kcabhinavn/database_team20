import { useNavigate } from 'react-router-dom';
import { useTrips, type TripListParams, type TripStatusFilter } from '@/api/trips';
import type { TripItem } from '@/api/types';
import { TripStatusBadge } from '@/components/Badge';
import { Button, ButtonLink } from '@/components/Button';
import { Card } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { SelectInput, TextInput } from '@/components/Field';
import { Pagination } from '@/components/Pagination';
import { QueryState, Skeleton } from '@/components/StateView';
import { useActor } from '@/context/ActorContext';
import { usePageTitle } from '@/context/PageTitleContext';
import { useDebouncedUrlParam, useUrlState } from '@/hooks/useUrlState';
import { formatDateTime, formatMoney, shortId } from '@/lib/format';
import page from '../page.module.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'ACTIVE', label: 'Active (requested or in transit)' },
  { value: 'REQUESTED', label: 'Requested' },
  { value: 'IN_TRANSIT', label: 'In transit' },
  { value: 'COMPLETED', label: 'Completed' },
];

/** Browse trips. Riders see only their own; the ops manager sees all 50,000+. */
export default function TripsPage() {
  const { role, riderId } = useActor();
  const isRider = role === 'rider';
  usePageTitle(isRider ? 'My trips' : 'Trips');
  const navigate = useNavigate();
  const url = useUrlState();
  const search = useDebouncedUrlParam('q');

  const pageNo = url.getNumber('page', 1);
  const pageSize = url.getNumber('size', 25);
  const status = (url.get('status') ?? '') as TripStatusFilter | '';
  const range = { from: url.get('from'), to: url.get('to') };
  const riderFilter = isRider ? riderId : url.get('rider');
  const vehicleFilter = url.get('vehicle');

  const params: TripListParams = {
    search: search.value || undefined,
    status: status || undefined,
    rider_id: riderFilter ?? undefined,
    vehicle_id: vehicleFilter ?? undefined,
    from: range.from,
    to: range.to,
    page: pageNo,
    page_size: pageSize,
  };
  const trips = useTrips(params, !isRider || Boolean(riderId));
  const filtered = Boolean(search.value || status || range.from || range.to || (!isRider && (riderFilter || vehicleFilter)));

  const clearFilters = () => {
    search.setText('');
    url.set({ q: null, status: null, from: null, to: null, rider: null, vehicle: null, page: null });
  };

  const columns: Column<TripItem>[] = [
    { key: 'id', header: 'Trip', render: (t) => <span className={page.mono}>{shortId(t.id)}</span> },
    ...(isRider ? [] : [{ key: 'rider', header: 'Rider', render: (t: TripItem) => t.rider.name }]),
    {
      key: 'vehicle',
      header: 'Vehicle',
      render: (t) => (
        <>
          <span className={page.strong}>{t.vehicle.license_plate}</span> <span className="muted">{t.vehicle.vehicle_class}</span>
        </>
      ),
    },
    { key: 'fare', header: 'Fare', align: 'right', render: (t) => formatMoney(t.fare_amount) },
    { key: 'status', header: 'Status', render: (t) => <TripStatusBadge status={t.status} /> },
    { key: 'created', header: 'Created', sorted: 'desc', render: (t) => <span className="muted">{formatDateTime(t.created_at)}</span> },
  ];

  if (isRider && !riderId) return <Skeleton label="Choosing a rider" />;

  return (
    <div className={page.page}>
      <div className={page.toolbar}>
        <TextInput
          label="Search"
          hideLabel
          type="search"
          placeholder={isRider ? 'Search by plate…' : 'Search rider name or plate…'}
          value={search.text}
          onChange={(e) => search.setText(e.target.value)}
          fieldClassName={page.grow}
        />
        <SelectInput
          label="Status"
          hideLabel
          options={STATUS_OPTIONS}
          value={status}
          onChange={(e) => url.set({ status: e.target.value || null, page: null })}
          fieldClassName={page.fixed}
        />
        <DateRangeFilter value={range} onChange={(r) => url.set({ from: r.from, to: r.to, page: null })} />
        {filtered ? (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : null}
      </div>
      {!isRider && (riderFilter || vehicleFilter) ? (
        <p className={page.meta}>
          Filtered to one {riderFilter ? 'rider' : 'vehicle'}.{' '}
          <button type="button" className={page.linkButton} onClick={() => url.set({ rider: null, vehicle: null, page: null })}>
            Show all trips
          </button>
        </p>
      ) : null}
      <Card>
        <QueryState
          query={trips}
          isEmpty={(d) => d.items.length === 0}
          empty={
            filtered
              ? { title: 'No trips match these filters', text: 'Try a wider date range or clear the status filter.', action: <Button onClick={clearFilters}>Clear filters</Button> }
              : { title: 'No trips yet', text: 'Booked trips will appear here.', action: isRider ? <ButtonLink to="/book" variant="primary">Book a trip</ButtonLink> : undefined }
          }
          loading={<Skeleton lines={10} label="Loading trips" />}
        >
          {(data) => (
            <>
              <DataTable
                caption="Trips, newest first"
                columns={columns}
                rows={data.items}
                rowKey={(t) => t.id}
                rowLabel={(t) => `Trip ${shortId(t.id)}, ${t.vehicle.license_plate}, ${t.status}`}
                onRowClick={(t) => navigate(`/trips/${t.id}`)}
                busy={trips.isFetching && trips.isPlaceholderData}
              />
              <Pagination
                page={pageNo}
                pageSize={pageSize}
                total={data.total}
                noun="trips"
                onPageChange={(p) => url.set({ page: p === 1 ? null : p })}
                onPageSizeChange={(s) => url.set({ size: s === 25 ? null : s, page: null })}
              />
            </>
          )}
        </QueryState>
      </Card>
    </div>
  );
}
