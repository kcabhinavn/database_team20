import { useState } from 'react';
import { useRanking } from '@/api/analytics';
import type { RankingItem } from '@/api/types';
import { Card } from '@/components/Card';
import { DataTable, type Column } from '@/components/DataTable';
import { Pagination } from '@/components/Pagination';
import { QueryState, Skeleton } from '@/components/StateView';
import { formatMoney } from '@/lib/format';

const PAGE_SIZE = 12;

const columns: Column<RankingItem>[] = [
  { key: 'rank', header: 'Rank', align: 'center', sorted: 'asc', render: (r) => <strong>{r.revenue_rank}</strong> },
  { key: 'plate', header: 'Vehicle', render: (r) => r.license_plate },
  { key: 'class', header: 'Class', render: (r) => <span className="muted">{r.vehicle_class}</span> },
  { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => formatMoney(r.total_revenue) },
];

/** DENSE_RANK() over lifetime revenue: ties share a rank and the next rank is not skipped. */
export function RankingCard({ selectedId, onSelect }: { selectedId: string | null; onSelect: (row: RankingItem) => void }) {
  const [page, setPage] = useState(1);
  const ranking = useRanking({ page, page_size: PAGE_SIZE });
  return (
    <Card title="Revenue ranking" subtitle="DENSE_RANK() over lifetime revenue (completed trips). Click a row to chart it.">
      <QueryState
        query={ranking}
        isEmpty={(d) => d.items.length === 0}
        empty={{ title: 'No completed trips yet' }}
        loading={<Skeleton lines={12} label="Loading ranking" />}
      >
        {(data) => (
          <>
            <DataTable
              caption="Vehicles ranked by revenue"
              columns={columns}
              rows={data.items}
              rowKey={(r) => r.vehicle_id}
              rowLabel={(r) => `Rank ${r.revenue_rank}, ${r.license_plate}, ${formatMoney(r.total_revenue)}`}
              onRowClick={onSelect}
              highlightKey={selectedId}
              busy={ranking.isFetching && ranking.isPlaceholderData}
            />
            <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} noun="vehicles" onPageChange={setPage} />
          </>
        )}
      </QueryState>
    </Card>
  );
}
