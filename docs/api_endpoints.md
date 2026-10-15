# API endpoints: RideSync

This started as the Step 1 sketch and now describes the API that was built (`api/`). FastAPI generates live, typed
documentation for the same endpoints at **http://localhost:8000/docs**. The server stays thin: it validates input, calls
the Part A procedure, query or pipeline, and shapes the JSON. The database does the real work.

## Conventions

- Base path `/api`, JSON in and out. IDs are UUID strings. Money is returned as numbers with 2 dp. Timestamps are ISO-8601
  UTC; `from`/`to` dates are inclusive UTC calendar days.
- **Lists** take `page` (default 1) and `page_size` (default 25, max 100) and return `{ items, page, page_size, total }`.
  Filtering, sorting and paging all happen in SQL or MongoDB; the browser never receives a whole table.
- **Errors** return `{ "error": { "code", "message", "details"? } }`:
  - 404 `NOT_FOUND`, 409 business rule (`INVALID_TRANSITION`), 422 `VALIDATION_ERROR` (with a `details[]` list of
    `{field, message}`);
  - 503 `POSTGRES_UNAVAILABLE` or `MONGO_UNAVAILABLE`, so a card backed by the other store keeps working;
  - 500 `INTERNAL_ERROR`.
- **Bookings are the exception:** both success and rollback return the `BookingResult` shape below, because a rejected
  booking is a normal, explainable outcome.
- **Postgres** connections run in autocommit mode, because `sp_atomic_booking` issues `COMMIT`/`ROLLBACK` itself.
- **MongoDB:** GeoJSON is `[lng, lat]`, and coordinates are sent as doubles (the validator rejects int32).

## System

| Method | Path | Inputs | Output |
|---|---|---|---|
| GET | `/api/health` | none | `{ status: "ok"\|"degraded", postgres: "ok"\|"down", mongo: "ok"\|"down" }` |

## Riders (Browse, actor picker, Audit trail)

| Method | Path | Inputs | Output | Backed by |
|---|---|---|---|---|
| GET | `/api/riders` | `search` (name), `has_active_trip`, paging | `Page<{ id, name, wallet_balance, active_trip: {id, status} \| null }>` | `riders` ⟕ active `trips` |
| GET | `/api/riders/{id}` | none | `{ id, name, wallet_balance, active_trip: Trip \| null, recent_trips: Trip[5], audit_entries }` | `riders`, `trips`, `wallet_audit_logs` |
| GET | `/api/riders/{id}/wallet-audit` | `from`, `to`, `order` (`asc`\|`desc`), paging | `Page<AuditRow> + { rider, date_from, date_to, order, summary: { entries, opening_balance, credits_total, credits_count, debits_total, debits_count, closing_balance } }` | `wallet_audit_logs` (read-only), `idx_wallet_audit_logs_rider_time` |

`AuditRow = { id, timestamp, action_type, amount_changed, balance_after, running_balance, matches }`. The running balance
is computed in SQL as the opening balance plus `SUM(amount_changed) OVER (ORDER BY timestamp, id)`. `matches` is true when
it equals the `balance_after` the trigger recorded.

## Vehicles (Browse, catalog)

| Method | Path | Inputs | Output | Backed by |
|---|---|---|---|---|
| GET | `/api/vehicles` | `search` (plate), `class`, `is_active`, `sort` (`plate`\|`earnings`\|`trips`), paging | `Page<{ id, license_plate, vehicle_class, is_active, lifetime_trip_count, total_earnings }> + { stats_as_of }` | `vehicles` ⟕ `vehicle_lifetime_stats` (MV), `mv_refresh_log` |
| GET | `/api/vehicles/classes` | none | `string[]` | `vehicles` |
| GET | `/api/vehicles/{id}` | none | vehicle + `{ revenue_rank, ranked_vehicles, stats_as_of }` | MV + `v_vehicle_revenue_ranking` |
| GET | `/api/vehicles/{id}/metadata` | none | the `VehicleMetadata` document as-is (minus `_id`); 404 if it has none | MongoDB `VehicleMetadata` |

## Trips (Browse, status changes)

| Method | Path | Inputs | Output | Backed by |
|---|---|---|---|---|
| GET | `/api/trips` | `search` (rider name or plate), `status` (`REQUESTED`\|`IN_TRANSIT`\|`COMPLETED`\|`ACTIVE`), `rider_id`, `vehicle_id`, `from`, `to`, paging | `Page<Trip>`, newest first | `trips` ⋈ `riders`, `vehicles`; `idx_trips_rider_id`, `idx_trips_vehicle_id` |
| GET | `/api/trips/{id}` | none | `Trip + { review: Review \| null }` | `trips` + MongoDB `TripReviews` (by `trip_id`) |
| PATCH | `/api/trips/{id}/status` | `{ status }` | `Trip`; 409 `INVALID_TRANSITION`, 404 | `fn_advance_trip_status` (REQUESTED → IN_TRANSIT → COMPLETED) |

`Trip = { id, rider: {id, name}, vehicle: {id, license_plate, vehicle_class}, fare_amount, status, created_at, next_status }`.

## Bookings (Workflow 1)

| Method | Path | Inputs | Output | Backed by |
|---|---|---|---|---|
| POST | `/api/bookings` | `{ rider_id, vehicle_id, fare_amount }` (fare as text or number) | `BookingResult`: **201** committed; **409** insufficient balance / active trip / inactive vehicle / concurrent update; **404** unknown rider or vehicle; **400** fare ≤ 0; **422** malformed input | `CALL sp_atomic_booking(...)` |

```text
BookingResult = { status: "COMMITTED" | "ROLLED_BACK",
                  reason: null | INSUFFICIENT_BALANCE | ACTIVE_TRIP_EXISTS | VEHICLE_INACTIVE | NOT_FOUND
                              | INVALID_FARE | CONCURRENT_UPDATE | BOOKING_FAILED,
                  message,                       // p_status exactly as the procedure returned it
                  fare_amount, trip: Trip | null,
                  balance_before, balance_after, // read on the same connection around the CALL
                  audit_entry: { id, timestamp, action_type, amount_changed, balance_after } | null,
                  active_trip_id }               // set for ACTIVE_TRIP_EXISTS
```

The trip INSERT and the trigger's audit INSERT run in the same transaction, so they share `NOW()`. The API uses that to
return exactly the audit row the booking produced.

## Analytics (Workflow 2 + materialized view)

| Method | Path | Inputs | Output | Backed by |
|---|---|---|---|---|
| GET | `/api/analytics/fleet-summary` | none | `{ total_vehicles, active_vehicles, lifetime_trips, total_earnings, avg_earnings_per_vehicle, top_vehicles[5], last_refreshed_at, last_refresh_duration_ms }` | `vehicle_lifetime_stats`, `mv_refresh_log` |
| POST | `/api/analytics/fleet-summary/refresh` | none | `{ refreshed_at, duration_ms }` | `refresh_vehicle_lifetime_stats()` (`REFRESH … CONCURRENTLY`, logged) |
| GET | `/api/analytics/revenue-ranking` | paging | `Page<{ revenue_rank, vehicle_id, license_plate, vehicle_class, total_revenue }>` | `v_vehicle_revenue_ranking` (Part A `DENSE_RANK()`) |
| GET | `/api/analytics/vehicles/{id}/revenue-trend` | `days` (7–365, default 30), `zero_fill` (default false) | `{ vehicle, revenue_rank, total_revenue, date_from, date_to, days, zero_fill, points: [{ day, daily_total, moving_avg_7day, has_trips }] }` | `fn_vehicle_revenue_trend` (Part A window query; `zero_fill` = calendar days) |

The trend window ends on the vehicle's last day with a completed trip. With `zero_fill=false` the output equals
`sql/06_window_analytics.sql` row for row; this was checked against all 30,148 rows.

## Map (Workflow 3)

| Method | Path | Inputs | Output | Backed by |
|---|---|---|---|---|
| GET | `/api/map/nearby-vehicles` | `lng`, `lat`, `radius_m` (100–20,000, default 5,000), `limit` (1–50, default 20) | `{ origin, radius_m, items: [{ vehicle_id, license_plate, vehicle_class, distance_m, location: {lng, lat}, last_ping_at }], generated_at }`, nearest first | `$geoNear` (`is_available: true`, `maxDistance`), then `$group` per vehicle; plates from Postgres |
| POST | `/api/map/pings/simulate` | `{ lng, lat, count }` (1–50) | `{ inserted, vehicle_ids }` (201) | `insertMany` into `TelemetryPings` near the origin |

`$geoNear` returns pings nearest-first, so only the nearest *N* pings are grouped (*N* = 25,000, growing if fewer than
`limit` vehicles are found). This is exact: a vehicle whose nearest ping falls outside the first *N* is farther away
than every vehicle inside them. A brute-force comparison returned identical results about 13× slower.

## Reviews (Workflow 4)

| Method | Path | Inputs | Output | Backed by |
|---|---|---|---|---|
| GET | `/api/reviews/summary` | `vehicle_id` (optional) | `{ vehicle_id, total, overall_average, rating_distribution: [{rating, count}] (1–5, zero-filled), top_tags: [{tag, count}] (top 10) }` | Part A `$facet` (`$match rating ≥ 1`, plus `vehicle_id`) |
| GET | `/api/reviews` | `vehicle_id`, `rating` (1–5), paging | `Page<{ id, trip_id, rider_id, vehicle_id, license_plate, rating, tags, comment, created_at }>`, newest first | `TripReviews` + plates from Postgres |
