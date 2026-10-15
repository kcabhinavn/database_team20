import { useRider, useWalletAudit } from '@/api/riders';
import type { AuditRow } from '@/api/types';
import { Amount, Badge } from '@/components/Badge';
import { Card, StatCard, StatGrid } from '@/components/Card';
import { Combobox, type ComboOption } from '@/components/Combobox';
import { DataTable, type Column } from '@/components/DataTable';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { SelectInput } from '@/components/Field';
import { Pagination } from '@/components/Pagination';
import { EmptyState, QueryState, Skeleton } from '@/components/StateView';
import { useActor } from '@/context/ActorContext';
import { usePageTitle } from '@/context/PageTitleContext';
import { useUrlState } from '@/hooks/useUrlState';
import { formatDateTime, formatDay, formatMoney, pluralize, shortId } from '@/lib/format';
import { loadRiderOptions } from '@/layout/RiderPicker';
import page from '../page.module.css';
import styles from './WalletAuditPage.module.css';

const ORDER_OPTIONS = [
  { value: 'asc', label: 'Oldest first' },
  { value: 'desc', label: 'Newest first' },
];

const columns: Column<AuditRow>[] = [
  { key: 'time', header: 'Date & time', render: (r) => formatDateTime(r.timestamp) },
  { key: 'id', header: 'Entry', render: (r) => <span className={page.mono}>{shortId(r.id)}</span> },
  {
    key: 'type',
    header: 'Type',
    render: (r) => <Badge tone={r.action_type === 'CREDIT' ? 'success' : 'danger'}>{r.action_type}</Badge>,
  },
  { key: 'amount', header: 'Amount', align: 'right', render: (r) => <Amount value={r.amount_changed} /> },
  { key: 'after', header: 'Balance after', align: 'right', render: (r) => formatMoney(r.balance_after) },
  {
    key: 'running',
    header: 'Running balance',
    align: 'right',
    render: (r) => <span className={page.strong}>{formatMoney(r.running_balance)}</span>,
  },
  {
    key: 'match',
    header: 'Match',
    align: 'center',
    render: (r) =>
      r.matches ? (
        <span className={styles.ok} aria-label="Matches the recorded balance">
          {'✓'}
        </span>
      ) : (
        <span className={styles.bad} aria-label="Does not match the recorded balance">
          {'✕'}
        </span>
      ),
  },
];

/** Workflow audit trail: wallet_audit_logs, read-only, with a running balance. */
export default function WalletAuditPage() {
  const { role, riderId: actingRiderId } = useActor();
  const isRider = role === 'rider';
  usePageTitle(isRider ? 'My wallet' : 'Wallet audit');
  const url = useUrlState();
  const riderId = isRider ? actingRiderId : url.get('rider');
  const rider = useRider(riderId);
  const range = { from: url.get('from'), to: url.get('to') };
  const order = url.get('order') === 'desc' ? 'desc' : 'asc';
  const pageNo = url.getNumber('page', 1);
  const pageSize = url.getNumber('size', 25);
  const audit = useWalletAudit(riderId, { from: range.from, to: range.to, order, page: pageNo, page_size: pageSize });

  const riderValue: ComboOption | null = rider.data ? { id: rider.data.id, label: rider.data.name } : null;

  return (
    <div className={page.page}>
      <div className={page.toolbar}>
        {isRider ? null : (
          <Combobox
            label="Rider"
            hideLabel
            queryKey="riders"
            loadOptions={loadRiderOptions}
            value={riderValue}
            onChange={(o) => url.set({ rider: o.id, page: null })}
            placeholder="Choose a rider…"
            className={page.grow}
          />
        )}
        <DateRangeFilter value={range} onChange={(r) => url.set({ from: r.from, to: r.to, page: null })} />
        <SelectInput
          label="Order"
          hideLabel
          options={ORDER_OPTIONS}
          value={order}
          onChange={(e) => url.set({ order: e.target.value === 'desc' ? 'desc' : null, page: null })}
          fieldClassName={page.fixed}
        />
        <span className={page.push}>
          <Badge>Read-only</Badge>
        </span>
      </div>

      {!riderId ? (
        isRider ? (
          <Skeleton label="Choosing a rider" />
        ) : (
          <Card>
            <EmptyState title="Choose a rider">Pick a rider above to read their wallet history.</EmptyState>
          </Card>
        )
      ) : (
        <QueryState query={audit} errorTitle="Could not load the audit trail" loading={<Skeleton lines={10} label="Loading audit trail" />}>
          {(data) => (
            <>
              <StatGrid>
                <StatCard
                  label="Opening balance"
                  value={formatMoney(data.summary.opening_balance)}
                  sub={data.date_from ? `on ${formatDay(data.date_from)}` : 'before the first entry'}
                />
                <StatCard label="Credits" value={formatMoney(data.summary.credits_total, { sign: true })} sub={pluralize(data.summary.credits_count, 'entry', 'entries')} />
                <StatCard label="Debits" value={formatMoney(data.summary.debits_total, { sign: true })} sub={pluralize(data.summary.debits_count, 'entry', 'entries')} />
                <StatCard
                  label="Closing balance"
                  value={formatMoney(data.summary.closing_balance)}
                  sub={`current wallet: ${formatMoney(data.rider.wallet_balance)}`}
                />
              </StatGrid>
              <Card
                title={`${data.rider.name}: ${pluralize(data.total, 'entry', 'entries')}`}
                subtitle="Running balance = opening balance + every amount so far (computed in SQL). ✓ means it equals the balance the trigger recorded."
              >
                {data.items.length === 0 ? (
                  <EmptyState title="No wallet activity in this date range">Try a wider range, or choose All.</EmptyState>
                ) : (
                  <>
                    <DataTable
                      caption={`Wallet audit entries for ${data.rider.name}`}
                      columns={columns.map((c) => (c.key === 'time' ? { ...c, sorted: order } : c))}
                      rows={data.items}
                      rowKey={(r) => r.id}
                      busy={audit.isFetching && audit.isPlaceholderData}
                    />
                    <Pagination
                      page={pageNo}
                      pageSize={pageSize}
                      total={data.total}
                      noun="entries"
                      onPageChange={(p) => url.set({ page: p === 1 ? null : p })}
                      onPageSizeChange={(s) => url.set({ size: s === 25 ? null : s, page: null })}
                    />
                  </>
                )}
                <p className={page.meta}>
                  Nothing on this screen can edit or delete an entry: wallet_audit_logs is append-only in the database too.
                  Dates are UTC.
                </p>
              </Card>
            </>
          )}
        </QueryState>
      )}
    </div>
  );
}
