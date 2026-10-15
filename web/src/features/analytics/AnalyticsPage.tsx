import { useEffect } from 'react';
import { useRanking } from '@/api/analytics';
import { useVehicle } from '@/api/vehicles';
import type { ComboOption } from '@/components/Combobox';
import { usePageTitle } from '@/context/PageTitleContext';
import { useUrlState } from '@/hooks/useUrlState';
import { formatMoney } from '@/lib/format';
import { FleetSummarySection } from './FleetSummarySection';
import { RankingCard } from './RankingCard';
import { RevenueTrendCard } from './RevenueTrendCard';
import styles from './AnalyticsPage.module.css';

/** Ops overview: materialized-view summary + Workflow 2 (trend and ranking). */
export default function AnalyticsPage() {
  usePageTitle('Overview');
  const url = useUrlState();
  const vehicleId = url.get('vehicle');
  const days = url.getNumber('days', 30);
  const zeroFill = url.get('zero') === '1';
  const vehicle = useVehicle(vehicleId);
  const topRanked = useRanking({ page: 1, page_size: 12 });

  // Default to the top-ranked vehicle so the chart is never empty on arrival.
  const top = topRanked.data?.items[0]?.vehicle_id;
  const set = url.set;
  useEffect(() => {
    if (!vehicleId && top) set({ vehicle: top });
  }, [vehicleId, top, set]);

  const selected: ComboOption | null = vehicle.data
    ? { id: vehicle.data.id, label: vehicle.data.license_plate, meta: formatMoney(vehicle.data.total_earnings, { whole: true }) }
    : null;

  return (
    <div className={styles.page}>
      <FleetSummarySection />
      <div className={styles.grid}>
        <RevenueTrendCard
          vehicle={selected}
          onVehicleChange={(o) => url.set({ vehicle: o.id })}
          days={days}
          onDaysChange={(d) => url.set({ days: d === 30 ? null : d })}
          zeroFill={zeroFill}
          onZeroFillChange={(v) => url.set({ zero: v ? '1' : null })}
        />
        <RankingCard selectedId={vehicleId} onSelect={(r) => url.set({ vehicle: r.vehicle_id })} />
      </div>
    </div>
  );
}
