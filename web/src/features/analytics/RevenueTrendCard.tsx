import { useState } from 'react';
import { useRevenueTrend } from '@/api/analytics';
import type { RevenueTrend } from '@/api/types';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { TrendChart } from '@/components/charts/TrendChart';
import { Chip } from '@/components/Chip';
import { Combobox, type ComboOption } from '@/components/Combobox';
import { EmptyState, QueryState } from '@/components/StateView';
import { formatDay, formatMoney } from '@/lib/format';
import { loadRankedVehicleOptions } from '../vehicles/vehicleOptions';
import styles from './AnalyticsPage.module.css';

const WINDOWS = [30, 90];

function TrendTable({ trend }: { trend: RevenueTrend }) {
  return (
    <div className={styles.tableScroll}>
      <table className={styles.miniTable}>
        <caption className="visually-hidden">Daily revenue and moving average for {trend.vehicle.license_plate}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">Daily revenue</th>
            <th scope="col">7-day moving average</th>
          </tr>
        </thead>
        <tbody>
          {trend.points.map((p) => (
            <tr key={p.day}>
              <td>{formatDay(p.day)}</td>
              <td className="num">{formatMoney(p.daily_total)}</td>
              <td className="num">{formatMoney(p.moving_avg_7day)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TrendStats({ trend }: { trend: RevenueTrend }) {
  const withTrips = trend.points.filter((p) => p.has_trips);
  const revenue = withTrips.reduce((sum, p) => sum + p.daily_total, 0);
  const best = withTrips.reduce<typeof withTrips[number] | null>((a, p) => (!a || p.daily_total > a.daily_total ? p : a), null);
  return (
    <dl className={styles.trendStats}>
      <div>
        <dt>Revenue in window</dt>
        <dd>{formatMoney(revenue)}</dd>
      </div>
      <div>
        <dt>Days with trips</dt>
        <dd>
          {withTrips.length} of {trend.days}
        </dd>
      </div>
      <div>
        <dt>Best day</dt>
        <dd>{best ? `${formatDay(best.day)} · ${formatMoney(best.daily_total)}` : '—'}</dd>
      </div>
    </dl>
  );
}

interface RevenueTrendCardProps {
  vehicle: ComboOption | null;
  onVehicleChange: (option: ComboOption) => void;
  days: number;
  onDaysChange: (days: number) => void;
  zeroFill: boolean;
  onZeroFillChange: (value: boolean) => void;
}

/** Workflow 2 for one vehicle: the Part A window query (RANGE 6 days PRECEDING). */
export function RevenueTrendCard({ vehicle, onVehicleChange, days, onDaysChange, zeroFill, onZeroFillChange }: RevenueTrendCardProps) {
  const trend = useRevenueTrend(vehicle?.id, { days, zero_fill: zeroFill });
  const [asTable, setAsTable] = useState(false);

  return (
    <Card
      title="Revenue trend"
      subtitle={
        trend.data
          ? `${trend.data.vehicle.license_plate}${trend.data.revenue_rank ? ` · rank #${trend.data.revenue_rank}` : ''} · ${formatDay(trend.data.date_from)} to ${formatDay(trend.data.date_to)}`
          : 'Daily revenue and 7-day moving average'
      }
    >
      <div className={styles.controls}>
        <Combobox
          label="Vehicle"
          hideLabel
          queryKey="ranked-vehicles"
          loadOptions={loadRankedVehicleOptions}
          value={vehicle}
          onChange={onVehicleChange}
          placeholder="Choose a vehicle…"
          className={styles.vehiclePicker}
        />
        <div className={styles.chips} role="group" aria-label="Window">
          {WINDOWS.map((d) => (
            <Chip key={d} selected={days === d} onClick={() => onDaysChange(d)}>
              {d} days
            </Chip>
          ))}
        </div>
        <label className={styles.checkbox}>
          <input type="checkbox" checked={zeroFill} onChange={(e) => onZeroFillChange(e.target.checked)} />
          Count days with no trips as $0
        </label>
      </div>
      {!vehicle ? (
        <EmptyState title="Choose a vehicle">Pick a vehicle above, or click a row in the ranking.</EmptyState>
      ) : (
        <QueryState
          query={trend}
          isEmpty={(t) => t.points.length === 0}
          empty={{ title: `No completed trips yet for ${vehicle.label}`, text: 'Its trend appears after its first completed trip.' }}
          errorTitle="Could not load the trend"
        >
          {(t) => (
            <>
              {asTable ? <TrendTable trend={t} /> : <TrendChart points={t.points} dateFrom={t.date_from} dateTo={t.date_to} />}
              <div className={styles.chartFooter}>
                <p className={styles.sectionSub}>
                  {t.zero_fill
                    ? 'Each average covers 7 calendar days; days without completed trips count as $0.'
                    : 'Part A query as written: the 7-day window only averages days that had completed trips (gaps are skipped).'}
                </p>
                <Button variant="ghost" size="sm" onClick={() => setAsTable((v) => !v)} aria-pressed={asTable}>
                  {asTable ? 'View as chart' : 'View as table'}
                </Button>
              </div>
              <TrendStats trend={t} />
            </>
          )}
        </QueryState>
      )}
    </Card>
  );
}
