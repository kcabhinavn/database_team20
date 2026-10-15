# Handover note: RideSync (Project 2)

**Inherited from:** `kushlalve07/2026201061_a1` (Assignment 1), forked to `kcabhinavn/database_team20` with the history kept.
**Reviewed by:** Team 20 at commit `0caf62a`, on Ubuntu 24.04 (kernel 7.0), PostgreSQL 16 and MongoDB 7.0.40.

## What worked

- `sql/01`–`05` apply cleanly. `mongo/01` creates the 3 collections plus the `2dsphere`, TTL and `rating` indexes.
- The seeders hit the advertised volumes: 50,000 trips, about 100,500 audit rows (written by the trigger), 500,000 pings
  and 25,000 reviews.
- `sp_atomic_booking` debits the wallet, the trigger writes the DEBIT row, and failures roll back with a readable
  `p_status` instead of raising. That made the booking UI simple to build.
- `wallet_audit_logs` really is append-only. The Workflow 2 query runs in about 35–100 ms on the partial covering index.
  `$geoNear` and `$facet` use their indexes as documented.

## What did not work, and what we did about it

| # | Problem | Status |
|---|---|---|
| 1 | The setup is Windows-only and assumes native installs. Native MongoDB 8.0 will not start on Linux kernel ≥ 6.19 (SERVER-121912). | **Fixed:** `docker-compose.yml` runs Postgres 16, Mongo 7, the API, the web app and a seeder. |
| 2 | `.gitignore` misses the `.venv/` the README tells you to create. | **Fixed** |
| 3 | Fare rounding mismatch: procedure parameters ignore `DECIMAL(10,2)`, so `10.005` stored `10.01` on the trip but debited `10.00`. | **Fixed:** round once inside the procedure. |
| 4 | Every CHECK violation was reported as "insufficient wallet balance" (including a negative fare), and a zero fare committed with no audit row. | **Fixed:** reject fares ≤ 0, and map errors by constraint name. |
| 5 | The procedure starts with `COMMIT`, so it fails inside a transaction. psycopg's default mode raises `InvalidTransactionTermination`. | **Handled:** the API pool runs in autocommit mode (documented). |
| 6 | 999 of 1,000 seeded riders had an open trip, so almost every booking was blocked. | **Fixed:** about 40% now (413). |
| 7 | All ~100k seeded audit rows fell within one minute, so a date filter was useless. The opening balance was never logged, so 0 of 1,000 riders' trails added up. | **Fixed:** an `AFTER INSERT` trigger logs the opening balance, and the seeder spreads history over 90 days in order. All 1,000 riders now reconcile with no breaks in the chain. |
| 8 | The "7-day" moving average skips days without trips (`RANGE` over sparse rows), which inflates it. | **Kept and offered:** the chart shows the Part A query as written by default, and a toggle switches to calendar days (`fn_vehicle_revenue_trend`). |
| 9 | No record of when the materialized view was last refreshed. | **Fixed:** `mv_refresh_log`, written by `refresh_vehicle_lifetime_stats()`. |
| 10 | Every vehicle's 1,000 pings were scattered over the whole city, so the nearest ping of any vehicle was always within metres of the origin. Pings expire 2 h after seeding (TTL). | **Fixed:** each vehicle now moves around its own home point (on land), and `--pings-only` reseeds pings in about 20 s. The map de-duplicates by vehicle and can simulate new pings. |
| 11 | The validators disagreed with `docs/mongo_schema_map.json` (`VehicleMetadata` had none). Integer coordinates are rejected. | **Fixed:** `mongo/04` aligns the validators, and the API always writes doubles. |
| 12 | There were no indexes for per-vehicle reviews or catalog lookups, so they ran as COLLSCAN. | **Fixed:** `mongo/04` adds them; the catalog index is unique. |
| 13 | Nothing moved a trip REQUESTED → IN_TRANSIT → COMPLETED. Vehicles are not constrained (123 had more than one in-transit trip). | **Fixed (trips):** `fn_advance_trip_status`. Vehicle overlap is left as is (outside the brief). |
| 14 | The README listed the wrong final commit hash (`b5843a6` instead of `0caf62a`). | Noted |

## What we changed

**New files:**
- `sql/07_a2_frontend_support.sql`: opening-balance trigger, `mv_refresh_log` and the logging refresh function,
  `fn_advance_trip_status`, `v_vehicle_revenue_ranking`, `fn_vehicle_revenue_trend`.
- `mongo/04_a2_indexes_and_validators.js`: the new indexes and the aligned validators.

**Edited files:**
- `sql/04_stored_procedures.sql`: fixes #3 and #4.
- `data_generation/*`: fixes #6, #7 and #10; refreshes the materialized view after seeding; defaults to port 5433.

Every Part A file keeps its original behaviour unless it is listed here. `sql/06` and the performance evidence are
unchanged.

## Suggestions for the original authors

- Ship a cross-platform setup and test it on a clean machine.
- Validate and round inside procedures, and map errors by constraint name.
- Seed data that exercises both the success and the failure paths, with realistic timestamps and positions.
- Audit the opening balance, and zero-fill calendar days before a moving average.
- Keep the schema map, the validators and the lookup indexes in sync.
