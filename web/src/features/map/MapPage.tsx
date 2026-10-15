import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '@/api/client';
import { RADIUS_M, useNearby, useSimulatePings } from '@/api/map';
import type { GeoPoint } from '@/api/types';
import { Alert } from '@/components/Alert';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { RelativeTime } from '@/components/RelativeTime';
import { EmptyState, ErrorState, Skeleton } from '@/components/StateView';
import { useActor } from '@/context/ActorContext';
import { usePageTitle } from '@/context/PageTitleContext';
import { useUrlState } from '@/hooks/useUrlState';
import { NearbyList } from './NearbyList';
import { ORIGINS, originFromParams } from './origins';
import styles from './MapPage.module.css';

// Leaflet is only downloaded when the map screen is opened.
const MapView = lazy(() => import('@/components/map/MapView'));

/** Workflow 3: nearest available vehicles within 5 km ($geoNear), refreshed every 5 s. */
export default function MapPage() {
  const { role } = useActor();
  usePageTitle(role === 'rider' ? 'Find a vehicle' : 'Live map');
  const url = useUrlState();
  const { point: origin, presetKey } = originFromParams(url.get('origin'), url.get('lng'), url.get('lat'));
  const [paused, setPaused] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const nearby = useNearby(origin, paused);
  const simulate = useSimulatePings();

  // "NEW" = vehicles that were not in the previous result for the same origin.
  const originKey = `${origin.lng.toFixed(5)},${origin.lat.toFixed(5)}`;
  const previous = useRef<{ key: string; ids: Set<string> } | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const items = nearby.data?.items;
  const isPlaceholder = nearby.isPlaceholderData;
  useEffect(() => {
    // Placeholder data is the previous origin's result: never use it as a baseline.
    if (!items || isPlaceholder) return;
    const ids = new Set(items.map((v) => v.vehicle_id));
    const prev = previous.current;
    setNewIds(prev && prev.key === originKey ? new Set([...ids].filter((id) => !prev.ids.has(id))) : new Set());
    previous.current = { key: originKey, ids };
  }, [items, isPlaceholder, originKey]);

  const set = url.set;
  const moveOrigin = useCallback((p: GeoPoint) => set({ origin: null, lng: p.lng.toFixed(5), lat: p.lat.toFixed(5) }), [set]);

  const markers = useMemo(
    () =>
      (items ?? []).map((v, i) => ({
        id: v.vehicle_id,
        rank: i + 1,
        location: v.location,
        label: `${i + 1}. ${v.license_plate ?? 'Vehicle'} · ${(v.distance_m / 1000).toFixed(2)} km`,
        isNew: newIds.has(v.vehicle_id),
      })),
    [items, newIds],
  );

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <span className={styles.label}>Origin</span>
        <div className={styles.chips} role="group" aria-label="Origin presets">
          {ORIGINS.map((o) => (
            <Chip key={o.key} selected={presetKey === o.key} onClick={() => set({ origin: o.key, lng: null, lat: null })}>
              {o.label}
            </Chip>
          ))}
        </div>
        <span className={styles.hint}>
          {presetKey ? 'or click the map' : `custom point ${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`}
        </span>
        <div className={styles.live}>
          <span className={[styles.liveDot, paused ? styles.liveDotPaused : ''].join(' ')} aria-hidden="true" />
          <span aria-live="off">
            {paused ? 'Paused' : 'Live'} {'·'} updated{' '}
            {nearby.dataUpdatedAt ? <RelativeTime iso={nearby.dataUpdatedAt} /> : '—'}
          </span>
          <Button size="sm" onClick={() => setPaused((p) => !p)} aria-pressed={paused}>
            {paused ? 'Resume' : 'Pause'}
          </Button>
          <Button size="sm" loading={simulate.isPending} onClick={() => simulate.mutate({ origin, count: 10 })}>
            Simulate pings
          </Button>
        </div>
      </div>
      {simulate.isError ? (
        <Alert tone="danger" title="Could not add demo pings" compact>
          {errorMessage(simulate.error)}
        </Alert>
      ) : null}
      {simulate.isSuccess ? (
        <p className={styles.hint} role="status">
          Added {simulate.data.inserted} fresh pings near the origin. New arrivals are marked NEW.
        </p>
      ) : null}
      <div className={styles.layout}>
        <div className={styles.mapBox}>
          <Suspense fallback={<Skeleton lines={6} label="Loading map" />}>
            <MapView
              origin={origin}
              radiusM={RADIUS_M}
              markers={markers}
              highlightId={highlightId}
              onOriginChange={moveOrigin}
              onMarkerSelect={setHighlightId}
              fitKey={originKey}
            />
          </Suspense>
        </div>
        <Card
          title={items ? `${items.length} nearest available within 5 km` : 'Nearest available vehicles'}
          subtitle="Sorted by distance, one row per vehicle ($geoNear)"
          className={styles.listCard}
        >
          {nearby.isError ? (
            items ? (
              <Alert tone="warning" title="Live updates are failing" compact>
                Showing the last result. Retrying automatically. {errorMessage(nearby.error)}
              </Alert>
            ) : (
              <ErrorState error={nearby.error} title="Could not load nearby vehicles" onRetry={() => void nearby.refetch()} />
            )
          ) : null}
          {!items && nearby.isPending ? <Skeleton lines={8} label="Loading nearby vehicles" /> : null}
          {items && items.length === 0 ? (
            <EmptyState
              title="No available vehicles within 5 km"
              action={
                <Button variant="primary" onClick={() => simulate.mutate({ origin, count: 10 })}>
                  Simulate pings
                </Button>
              }
            >
              Try another origin, or add demo pings (seeded pings expire 2 hours after seeding).
            </EmptyState>
          ) : null}
          {items && items.length > 0 ? (
            <NearbyList items={items} newIds={newIds} mode={role} highlightId={highlightId} onHighlight={setHighlightId} />
          ) : null}
        </Card>
      </div>
    </div>
  );
}
