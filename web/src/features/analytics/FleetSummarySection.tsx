import { useFleetSummary, useRefreshFleetSummary } from '@/api/analytics';
import { errorMessage } from '@/api/client';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { StatCard, StatGrid } from '@/components/Card';
import { RelativeTime } from '@/components/RelativeTime';
import { ErrorState } from '@/components/StateView';
import { formatDateTime, formatMoney, formatNumber } from '@/lib/format';
import styles from './AnalyticsPage.module.css';

/** Totals from the materialized view, with its "last refreshed" time and a refresh button. */
export function FleetSummarySection() {
  const summary = useFleetSummary();
  const refresh = useRefreshFleetSummary();
  const data = summary.data;

  return (
    <section className={styles.section} aria-labelledby="fleet-summary-title">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="fleet-summary-title" className={styles.sectionTitle}>
            Fleet summary
          </h2>
          <p className={styles.sectionSub}>
            From the materialized view <code>vehicle_lifetime_stats</code> (completed trips only)
          </p>
        </div>
        <div className={styles.refresh}>
          <p className={styles.sectionSub} aria-live="polite">
            {data?.last_refreshed_at ? (
              <>
                Last refreshed {formatDateTime(data.last_refreshed_at)} {'·'} <RelativeTime iso={data.last_refreshed_at} intervalMs={30_000} />
                {data.last_refresh_duration_ms !== null ? ` · took ${formatNumber(Math.round(data.last_refresh_duration_ms))} ms` : ''}
              </>
            ) : data ? (
              'Not refreshed since setup'
            ) : null}
          </p>
          <Button loading={refresh.isPending} onClick={() => refresh.mutate()}>
            {refresh.isPending ? 'Refreshing…' : 'Refresh now'}
          </Button>
        </div>
      </div>
      {refresh.isError ? (
        <Alert tone="danger" title="The refresh failed" compact>
          {errorMessage(refresh.error)}
        </Alert>
      ) : null}
      {summary.isError && !data ? (
        <ErrorState error={summary.error} title="Could not load the fleet summary" onRetry={() => void summary.refetch()} />
      ) : (
        <StatGrid>
          <StatCard label="Vehicles" loading={!data} value={formatNumber(data?.total_vehicles)} sub={data ? `${formatNumber(data.active_vehicles)} active` : undefined} />
          <StatCard label="Completed trips" loading={!data} value={formatNumber(data?.lifetime_trips)} sub="lifetime" />
          <StatCard label="Total earnings" loading={!data} value={formatMoney(data?.total_earnings, { whole: true })} sub={data ? formatMoney(data.total_earnings) : undefined} />
          <StatCard label="Average per vehicle" loading={!data} value={formatMoney(data?.avg_earnings_per_vehicle)} sub="lifetime earnings" />
        </StatGrid>
      )}
    </section>
  );
}
