import { fetchVehicles } from '@/api/vehicles';
import type { ComboOption } from '@/components/Combobox';
import { formatMoney } from '@/lib/format';

/** Options for vehicle pickers. Inactive vehicles stay selectable (so the rejection can be shown). */
export async function loadVehicleOptions(search: string): Promise<ComboOption[]> {
  const page = await fetchVehicles({ search: search || undefined, page_size: 10, sort: 'plate' });
  return page.items.map((v) => ({
    id: v.id,
    label: v.license_plate,
    meta: `${v.vehicle_class}${v.is_active ? '' : ' · out of service'}`,
  }));
}

/** Same list, labelled with lifetime earnings (analytics pickers). */
export async function loadRankedVehicleOptions(search: string): Promise<ComboOption[]> {
  const page = await fetchVehicles({ search: search || undefined, page_size: 10, sort: search ? 'plate' : 'earnings' });
  return page.items.map((v) => ({ id: v.id, label: v.license_plate, meta: formatMoney(v.total_earnings, { whole: true }) }));
}
