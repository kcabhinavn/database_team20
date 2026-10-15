import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { GeoPoint } from '@/api/types';
import styles from './MapView.module.css';

export interface MapMarker {
  id: string;
  rank: number;
  location: GeoPoint;
  label: string;
  isNew: boolean;
}

interface MapViewProps {
  origin: GeoPoint;
  radiusM: number;
  markers: MapMarker[];
  highlightId?: string | null;
  onOriginChange: (origin: GeoPoint) => void;
  onMarkerSelect?: (id: string) => void;
  /** When this changes the map re-fits to the origin and the results. */
  fitKey: string;
}

const ORIGIN_ICON = L.divIcon({
  className: styles.originIcon,
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/** Leaflet map: origin pin, 5 km ring, numbered vehicle markers. Click to move the origin. */
export default function MapView({ origin, radiusM, markers, highlightId, onOriginChange, onMarkerSelect, fitKey }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const originMarker = useRef<L.Marker | null>(null);
  const ring = useRef<L.Circle | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const lastFit = useRef<string | null>(null);
  const callbacks = useRef({ onOriginChange, onMarkerSelect });
  useEffect(() => {
    callbacks.current = { onOriginChange, onMarkerSelect };
  }, [onOriginChange, onMarkerSelect]);

  // Create the map once.
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { zoomControl: true, attributionControl: true }).setView(
      [origin.lat, origin.lng],
      15,
    );
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instance);
    ring.current = L.circle([origin.lat, origin.lng], {
      radius: radiusM,
      color: '#0F766E',
      weight: 1.5,
      dashArray: '6 5',
      fillOpacity: 0.04,
      interactive: false,
    }).addTo(instance);
    originMarker.current = L.marker([origin.lat, origin.lng], { icon: ORIGIN_ICON, keyboard: false, interactive: false })
      .addTo(instance);
    layer.current = L.layerGroup().addTo(instance);
    instance.on('click', (event: L.LeafletMouseEvent) =>
      callbacks.current.onOriginChange({ lng: event.latlng.lng, lat: event.latlng.lat }),
    );
    map.current = instance;
    // Leaflet must re-measure when the layout around it changes (breakpoints, sidebar).
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => instance.invalidateSize());
    observer?.observe(container.current);
    return () => {
      observer?.disconnect();
      instance.remove();
      map.current = null;
    };
    // Created once; later origin/radius changes are applied by the effects below.
  }, []);

  useEffect(() => {
    ring.current?.setLatLng([origin.lat, origin.lng]).setRadius(radiusM);
    originMarker.current?.setLatLng([origin.lat, origin.lng]);
  }, [origin.lat, origin.lng, radiusM]);

  useEffect(() => {
    const group = layer.current;
    if (!group) return;
    group.clearLayers();
    for (const m of markers) {
      const classes = [styles.vehicleIcon, m.isNew ? styles.isNew : '', m.id === highlightId ? styles.isHighlighted : '']
        .filter(Boolean)
        .join(' ');
      L.marker([m.location.lat, m.location.lng], {
        icon: L.divIcon({ className: classes, html: `<span>${m.rank}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] }),
        title: m.label,
        alt: m.label,
        zIndexOffset: m.id === highlightId ? 1000 : -m.rank,
      })
        .bindTooltip(m.label, { direction: 'top', offset: [0, -12] })
        .on('click', () => callbacks.current.onMarkerSelect?.(m.id))
        .addTo(group);
    }
  }, [markers, highlightId]);

  // Fit to origin + results once per origin (not on every poll).
  useEffect(() => {
    const instance = map.current;
    if (!instance || lastFit.current === fitKey || markers.length === 0) return;
    const bounds = L.latLngBounds([[origin.lat, origin.lng], ...markers.map((m) => [m.location.lat, m.location.lng] as [number, number])]);
    instance.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    lastFit.current = fitKey;
  }, [fitKey, markers, origin.lat, origin.lng]);

  return <div ref={container} className={styles.map} role="application" aria-label="Map of nearby vehicles. Click to move the origin." />;
}
