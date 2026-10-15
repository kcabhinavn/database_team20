import type { NearbyVehicle } from '@/api/types';
import { Badge } from '@/components/Badge';
import { ButtonLink } from '@/components/Button';
import { RelativeTime } from '@/components/RelativeTime';
import { formatDistance } from '@/lib/format';
import styles from './MapPage.module.css';

interface NearbyListProps {
  items: NearbyVehicle[];
  newIds: Set<string>;
  mode: 'rider' | 'ops';
  highlightId: string | null;
  onHighlight: (id: string | null) => void;
}

/** The same results as the map, nearest first: the accessible view of Workflow 3. */
export function NearbyList({ items, newIds, mode, highlightId, onHighlight }: NearbyListProps) {
  return (
    <ol className={styles.list} aria-label="Nearest available vehicles">
      {items.map((v, index) => (
        <li
          key={v.vehicle_id}
          className={[styles.row, v.vehicle_id === highlightId ? styles.rowActive : ''].join(' ')}
          onMouseEnter={() => onHighlight(v.vehicle_id)}
          onMouseLeave={() => onHighlight(null)}
          onFocus={() => onHighlight(v.vehicle_id)}
        >
          <span className={styles.rank} aria-hidden="true">
            {index + 1}
          </span>
          <div className={styles.rowMain}>
            <p className={styles.plate}>
              {v.license_plate ?? v.vehicle_id.slice(0, 8)}
              {newIds.has(v.vehicle_id) ? (
                <Badge tone="brand" solid>
                  New
                </Badge>
              ) : null}
            </p>
            <p className={styles.rowMeta}>
              {v.vehicle_class ?? 'Unknown class'} {'·'} ping <RelativeTime iso={v.last_ping_at} />
            </p>
          </div>
          <span className={styles.distance}>{formatDistance(v.distance_m)}</span>
          {mode === 'rider' ? (
            <ButtonLink size="sm" variant="secondary" to={`/book?vehicle=${v.vehicle_id}`} aria-label={`Book ${v.license_plate ?? 'this vehicle'}`}>
              Book
            </ButtonLink>
          ) : (
            <ButtonLink size="sm" to={`/vehicles/${v.vehicle_id}`} aria-label={`Details for ${v.license_plate ?? 'this vehicle'}`}>
              Details
            </ButtonLink>
          )}
        </li>
      ))}
    </ol>
  );
}
