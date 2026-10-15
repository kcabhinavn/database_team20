import { useNavigate } from 'react-router-dom';
import { useVehicleClasses, useVehicles, type VehicleSort } from '@/api/vehicles';
import type { VehicleItem } from '@/api/types';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { SelectInput, TextInput } from '@/components/Field';
import { Pagination } from '@/components/Pagination';
import { RelativeTime } from '@/components/RelativeTime';
import { QueryState, Skeleton } from '@/components/StateView';
import { usePageTitle } from '@/context/PageTitleContext';
import { useDebouncedUrlParam, useUrlState } from '@/hooks/useUrlState';
import { formatMoney, formatNumber } from '@/lib/format';
import page from '../page.module.css';

const SORTS: { value: VehicleSort; label: string }[] = [
  { value: 'plate', label: 'Sort: plate' },
  { value: 'earnings', label: 'Sort: earnings' },
  { value: 'trips', label: 'Sort: trips' },
];

const STATUS = [
  { value: '', label: 'Active and inactive' },
  { value: 'true', label: 'Active only' },
  { value: 'false', label: 'Out of service' },
];

export default function VehiclesPage() {
  usePageTitle('Vehicles');
  const navigate = useNavigate();
  const url = useUrlState();
  const search = useDebouncedUrlParam('q');
  const classes = useVehicleClasses();
  const vehicleClass = url.get('class') ?? '';
  const active = url.get('active') ?? '';
  const sort = (url.get('sort') as VehicleSort | null) ?? 'plate';
  const pageNo = url.getNumber('page', 1);
  const pageSize = url.getNumber('size', 25);

  const vehicles = useVehicles({
    search: search.value || undefined,
    class: vehicleClass || undefined,
    is_active: active === '' ? undefined : active === 'true',
    sort,
    page: pageNo,
    page_size: pageSize,
  });
  const filtered = Boolean(search.value || vehicleClass || active);
  const clear = () => {
    search.setText('');
    url.set({ q: null, class: null, active: null, page: null });
  };

  const columns: Column<VehicleItem>[] = [
    { key: 'plate', header: 'Plate', sorted: sort === 'plate' ? 'asc' : undefined, render: (v) => <span className={page.strong}>{v.license_plate}</span> },
    { key: 'class', header: 'Class', render: (v) => v.vehicle_class },
    {
      key: 'status',
      header: 'Status',
      render: (v) => <Badge tone={v.is_active ? 'success' : 'neutral'}>{v.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    {
      key: 'trips',
      header: 'Lifetime trips',
      align: 'right',
      sorted: sort === 'trips' ? 'desc' : undefined,
      render: (v) => formatNumber(v.lifetime_trip_count),
    },
    {
      key: 'earnings',
      header: 'Earnings',
      align: 'right',
      sorted: sort === 'earnings' ? 'desc' : undefined,
      render: (v) => formatMoney(v.total_earnings),
    },
  ];

  return (
    <div className={page.page}>
      <div className={page.toolbar}>
        <TextInput
          label="Search vehicles"
          hideLabel
          type="search"
          placeholder="Search by plate…"
          value={search.text}
          onChange={(e) => search.setText(e.target.value)}
          fieldClassName={page.grow}
        />
        <SelectInput
          label="Class"
          hideLabel
          options={[{ value: '', label: 'All classes' }, ...(classes.data ?? []).map((c) => ({ value: c, label: c }))]}
          value={vehicleClass}
          onChange={(e) => url.set({ class: e.target.value || null, page: null })}
          fieldClassName={page.fixed}
        />
        <SelectInput
          label="Status"
          hideLabel
          options={STATUS}
          value={active}
          onChange={(e) => url.set({ active: e.target.value || null, page: null })}
          fieldClassName={page.fixed}
        />
        <SelectInput
          label="Sort"
          hideLabel
          options={SORTS}
          value={sort}
          onChange={(e) => url.set({ sort: e.target.value === 'plate' ? null : e.target.value, page: null })}
          fieldClassName={page.fixed}
        />
      </div>
      <Card>
        <QueryState
          query={vehicles}
          isEmpty={(d) => d.items.length === 0}
          empty={{ title: 'No vehicles match', action: filtered ? <Button onClick={clear}>Clear filters</Button> : undefined }}
          loading={<Skeleton lines={10} label="Loading vehicles" />}
        >
          {(data) => (
            <>
              <p className={page.meta}>
                Trips and earnings come from the materialized view, as of{' '}
                {data.stats_as_of ? <RelativeTime iso={data.stats_as_of} intervalMs={30_000} /> : 'its last refresh'}. Refresh it
                on the Overview page.
              </p>
              <DataTable
                caption="Vehicles with lifetime stats"
                columns={columns}
                rows={data.items}
                rowKey={(v) => v.id}
                rowLabel={(v) => `${v.license_plate}, ${v.vehicle_class}`}
                onRowClick={(v) => navigate(`/vehicles/${v.id}`)}
                busy={vehicles.isFetching && vehicles.isPlaceholderData}
              />
              <Pagination
                page={pageNo}
                pageSize={pageSize}
                total={data.total}
                noun="vehicles"
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
