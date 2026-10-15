import { useNavigate } from 'react-router-dom';
import { useRiders } from '@/api/riders';
import type { RiderItem } from '@/api/types';
import { TripStatusBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { SelectInput, TextInput } from '@/components/Field';
import { Pagination } from '@/components/Pagination';
import { QueryState, Skeleton } from '@/components/StateView';
import { usePageTitle } from '@/context/PageTitleContext';
import { useDebouncedUrlParam, useUrlState } from '@/hooks/useUrlState';
import { formatMoney } from '@/lib/format';
import page from '../page.module.css';

const ACTIVE_OPTIONS = [
  { value: '', label: 'All riders' },
  { value: 'true', label: 'With an active trip' },
  { value: 'false', label: 'Without an active trip' },
];

const columns: Column<RiderItem>[] = [
  { key: 'name', header: 'Name', sorted: 'asc', render: (r) => <span className={page.strong}>{r.name}</span> },
  { key: 'balance', header: 'Wallet balance', align: 'right', render: (r) => formatMoney(r.wallet_balance) },
  {
    key: 'trip',
    header: 'Active trip',
    render: (r) => (r.active_trip ? <TripStatusBadge status={r.active_trip.status} /> : <span className="muted">{'—'}</span>),
  },
];

export default function RidersPage() {
  usePageTitle('Riders');
  const navigate = useNavigate();
  const url = useUrlState();
  const search = useDebouncedUrlParam('q');
  const active = url.get('active') ?? '';
  const pageNo = url.getNumber('page', 1);
  const pageSize = url.getNumber('size', 25);
  const riders = useRiders({
    search: search.value || undefined,
    has_active_trip: active === '' ? undefined : active === 'true',
    page: pageNo,
    page_size: pageSize,
  });
  const filtered = Boolean(search.value || active);
  const clear = () => {
    search.setText('');
    url.set({ q: null, active: null, page: null });
  };

  return (
    <div className={page.page}>
      <div className={page.toolbar}>
        <TextInput
          label="Search riders"
          hideLabel
          type="search"
          placeholder="Search by name…"
          value={search.text}
          onChange={(e) => search.setText(e.target.value)}
          fieldClassName={page.grow}
        />
        <SelectInput
          label="Active trip"
          hideLabel
          options={ACTIVE_OPTIONS}
          value={active}
          onChange={(e) => url.set({ active: e.target.value || null, page: null })}
          fieldClassName={page.fixed}
        />
      </div>
      <Card>
        <QueryState
          query={riders}
          isEmpty={(d) => d.items.length === 0}
          empty={{ title: 'No riders match', text: 'Try another name.', action: filtered ? <Button onClick={clear}>Clear filters</Button> : undefined }}
          loading={<Skeleton lines={10} label="Loading riders" />}
        >
          {(data) => (
            <>
              <DataTable
                caption="Riders by name"
                columns={columns}
                rows={data.items}
                rowKey={(r) => r.id}
                rowLabel={(r) => `${r.name}, balance ${formatMoney(r.wallet_balance)}`}
                onRowClick={(r) => navigate(`/riders/${r.id}`)}
                busy={riders.isFetching && riders.isPlaceholderData}
              />
              <Pagination
                page={pageNo}
                pageSize={pageSize}
                total={data.total}
                noun="riders"
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
