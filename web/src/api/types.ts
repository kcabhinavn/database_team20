/** Response shapes of the RideSync API (mirrors api/app/schemas). */

export type UUID = string;
export type TripStatus = 'REQUESTED' | 'IN_TRANSIT' | 'COMPLETED';

export interface Page<T> {
  items: T[];
  page: number;
  page_size: number;
  total: number;
}

export interface RiderRef {
  id: UUID;
  name: string;
}

export interface VehicleRef {
  id: UUID;
  license_plate: string;
  vehicle_class: string;
}

export interface TripRef {
  id: UUID;
  status: TripStatus;
}

export interface RiderItem {
  id: UUID;
  name: string;
  wallet_balance: number;
  active_trip: TripRef | null;
}

export interface TripItem {
  id: UUID;
  rider: RiderRef;
  vehicle: VehicleRef;
  fare_amount: number;
  status: TripStatus;
  created_at: string;
  next_status: TripStatus | null;
}

export interface Review {
  id: string;
  trip_id: string;
  rider_id: string | null;
  vehicle_id: string | null;
  rating: number;
  tags: string[];
  comment: string | null;
  created_at: string;
}

export interface TripDetail extends TripItem {
  review: Review | null;
}

export interface RiderDetail {
  id: UUID;
  name: string;
  wallet_balance: number;
  active_trip: TripItem | null;
  recent_trips: TripItem[];
  audit_entries: number;
}

export interface VehicleItem {
  id: UUID;
  license_plate: string;
  vehicle_class: string;
  is_active: boolean;
  lifetime_trip_count: number;
  total_earnings: number;
}

export interface VehiclePage extends Page<VehicleItem> {
  stats_as_of: string | null;
}

export interface VehicleDetail extends VehicleItem {
  revenue_rank: number | null;
  ranked_vehicles: number;
  stats_as_of: string | null;
}

/** VehicleMetadata is schema-flexible, so it is rendered generically. */
export type CatalogDocument = Record<string, unknown>;

export type BookingReason =
  | 'INSUFFICIENT_BALANCE'
  | 'ACTIVE_TRIP_EXISTS'
  | 'VEHICLE_INACTIVE'
  | 'NOT_FOUND'
  | 'INVALID_FARE'
  | 'CONCURRENT_UPDATE'
  | 'BOOKING_FAILED';

export interface AuditEntry {
  id: UUID;
  timestamp: string;
  action_type: 'CREDIT' | 'DEBIT';
  amount_changed: number;
  balance_after: number;
}

export interface BookingRequest {
  rider_id: UUID;
  vehicle_id: UUID;
  /** Sent as text so the server receives exactly what was typed. */
  fare_amount: string;
}

export interface BookingResult {
  status: 'COMMITTED' | 'ROLLED_BACK';
  reason: BookingReason | null;
  message: string;
  fare_amount: number;
  trip: TripItem | null;
  balance_before: number | null;
  balance_after: number | null;
  audit_entry: AuditEntry | null;
  active_trip_id: UUID | null;
}

export interface AuditRow extends AuditEntry {
  running_balance: number;
  matches: boolean;
}

export interface AuditSummary {
  entries: number;
  opening_balance: number | null;
  credits_total: number;
  credits_count: number;
  debits_total: number;
  debits_count: number;
  closing_balance: number | null;
}

export interface WalletAudit extends Page<AuditRow> {
  rider: { id: UUID; name: string; wallet_balance: number };
  date_from: string | null;
  date_to: string | null;
  order: 'asc' | 'desc';
  summary: AuditSummary;
}

export interface FleetSummary {
  total_vehicles: number;
  active_vehicles: number;
  lifetime_trips: number;
  total_earnings: number;
  avg_earnings_per_vehicle: number;
  top_vehicles: VehicleItem[];
  last_refreshed_at: string | null;
  last_refresh_duration_ms: number | null;
}

export interface RefreshResult {
  refreshed_at: string;
  duration_ms: number;
}

export interface RankingItem {
  revenue_rank: number;
  vehicle_id: UUID;
  license_plate: string;
  vehicle_class: string;
  total_revenue: number;
}

export interface TrendPoint {
  day: string;
  daily_total: number;
  moving_avg_7day: number;
  has_trips: boolean;
}

export interface RevenueTrend {
  vehicle: VehicleRef;
  revenue_rank: number | null;
  total_revenue: number | null;
  date_from: string;
  date_to: string;
  days: number;
  zero_fill: boolean;
  points: TrendPoint[];
}

export interface GeoPoint {
  lng: number;
  lat: number;
}

export interface NearbyVehicle {
  vehicle_id: string;
  license_plate: string | null;
  vehicle_class: string | null;
  distance_m: number;
  location: GeoPoint;
  last_ping_at: string;
}

export interface NearbyResult {
  origin: GeoPoint;
  radius_m: number;
  items: NearbyVehicle[];
  generated_at: string;
}

export interface SimulateResult {
  inserted: number;
  vehicle_ids: string[];
}

export interface ReviewSummary {
  vehicle_id: UUID | null;
  total: number;
  overall_average: number | null;
  rating_distribution: { rating: number; count: number }[];
  top_tags: { tag: string; count: number }[];
}

export interface ReviewItem extends Review {
  license_plate: string | null;
}

export interface Health {
  status: 'ok' | 'degraded';
  postgres: 'ok' | 'down';
  mongo: 'ok' | 'down';
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}
