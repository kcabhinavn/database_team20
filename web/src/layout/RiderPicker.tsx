import { useEffect } from 'react';
import { ApiError } from '@/api/client';
import { fetchRiders, useRider, useRiders } from '@/api/riders';
import { Combobox, type ComboOption } from '@/components/Combobox';
import { useActor } from '@/context/ActorContext';
import { formatMoney } from '@/lib/format';

export async function loadRiderOptions(search: string): Promise<ComboOption[]> {
  const page = await fetchRiders({ search: search || undefined, page_size: 10 });
  return page.items.map((r) => ({
    id: r.id,
    label: r.name,
    meta: `${formatMoney(r.wallet_balance)}${r.active_trip ? ' · on a trip' : ''}`,
  }));
}

/**
 * "Acting as" rider. If none is chosen yet, the first rider without an active
 * trip is picked so a booking works straight away.
 */
export function RiderPicker() {
  const { riderId, setRiderId } = useActor();
  const rider = useRider(riderId);
  const firstFree = useRiders({ has_active_trip: false, page_size: 1 });

  useEffect(() => {
    if (!riderId && firstFree.data?.items[0]) setRiderId(firstFree.data.items[0].id);
  }, [riderId, firstFree.data, setRiderId]);

  // A remembered rider that no longer exists (e.g. after a re-seed): pick again.
  const missing = rider.error instanceof ApiError && rider.error.status === 404;
  useEffect(() => {
    if (riderId && missing) setRiderId(null);
  }, [riderId, missing, setRiderId]);

  const value: ComboOption | null = rider.data
    ? { id: rider.data.id, label: rider.data.name, meta: formatMoney(rider.data.wallet_balance) }
    : null;

  return (
    <Combobox
      label="Acting as rider"
      hideLabel
      queryKey="riders"
      loadOptions={loadRiderOptions}
      value={value}
      onChange={(option) => setRiderId(option.id)}
      placeholder={rider.isPending && riderId ? 'Loading rider…' : 'Choose a rider…'}
    />
  );
}
