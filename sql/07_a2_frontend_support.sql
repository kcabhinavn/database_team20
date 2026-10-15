-- Assignment 2 (Team 20): database support for the web front end.
-- Safe to re-run on an existing database (idempotent).
--   psql -U ridesync -d ridesync -f sql/07_a2_frontend_support.sql
-- See docs/handover_note.md (#7, #8, #9, #13) for why each object exists.

-- ---------------------------------------------------------------------------
-- 1. Opening balance is audited (handover #7)
--    Part A only audited UPDATEs, so a rider's audit trail never added up to
--    the wallet balance. Logging the opening balance on INSERT makes
--    SUM(amount_changed) = wallet_balance for every new rider.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION audit_opening_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.wallet_balance <> 0 THEN
        INSERT INTO wallet_audit_logs (rider_id, amount_changed, action_type, balance_after, "timestamp")
        VALUES (NEW.id, NEW.wallet_balance, 'CREDIT', NEW.wallet_balance, NOW());
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS rider_wallet_opening_audit ON riders;
CREATE TRIGGER rider_wallet_opening_audit
AFTER INSERT ON riders
FOR EACH ROW
EXECUTE FUNCTION audit_opening_balance();

-- ---------------------------------------------------------------------------
-- 2. "Last refreshed" for the materialized view (handover #9)
--    PostgreSQL does not record when a materialized view was refreshed, so
--    the refresh function now logs every run.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mv_refresh_log (
    id            BIGSERIAL PRIMARY KEY,
    view_name     TEXT        NOT NULL,
    refreshed_at  TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    duration_ms   NUMERIC(10, 1) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mv_refresh_log_view_time
    ON mv_refresh_log (view_name, refreshed_at DESC);

CREATE OR REPLACE FUNCTION refresh_vehicle_lifetime_stats()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_started TIMESTAMPTZ := clock_timestamp();
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY vehicle_lifetime_stats;
    INSERT INTO mv_refresh_log (view_name, refreshed_at, duration_ms)
    VALUES ('vehicle_lifetime_stats',
            clock_timestamp(),
            ROUND((EXTRACT(EPOCH FROM clock_timestamp() - v_started) * 1000)::numeric, 1));
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Trip status transitions (handover #13)
--    REQUESTED -> IN_TRANSIT -> COMPLETED, one step at a time. Completing a
--    trip frees the rider, so the partial unique index idx_active_rider_trip
--    can be demonstrated blocking and then allowing a booking.
--    Errors: P0002 no_data_found (unknown trip), 22023 invalid_parameter_value
--    (illegal transition).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_advance_trip_status(p_trip_id UUID, p_new_status VARCHAR)
RETURNS trips
LANGUAGE plpgsql
AS $$
DECLARE
    v_trip     trips;
    v_expected VARCHAR;
BEGIN
    SELECT * INTO v_trip FROM trips WHERE id = p_trip_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'trip % not found', p_trip_id
            USING ERRCODE = 'no_data_found';
    END IF;

    v_expected := CASE v_trip.status
                      WHEN 'REQUESTED'  THEN 'IN_TRANSIT'
                      WHEN 'IN_TRANSIT' THEN 'COMPLETED'
                  END;

    IF v_expected IS NULL OR p_new_status IS DISTINCT FROM v_expected THEN
        RAISE EXCEPTION 'cannot move trip from % to %', v_trip.status, COALESCE(p_new_status, 'NULL')
            USING ERRCODE = 'invalid_parameter_value',
                  HINT = COALESCE('next allowed status is ' || v_expected, 'trip is already COMPLETED');
    END IF;

    UPDATE trips SET status = p_new_status WHERE id = p_trip_id
    RETURNING * INTO v_trip;
    RETURN v_trip;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Workflow 2 for the UI
--    v_vehicle_revenue_ranking: the Part A DENSE_RANK() CTE, unchanged, as a view.
--    fn_vehicle_revenue_trend: the Part A 7-day moving average for one vehicle.
--      p_zero_fill = FALSE reproduces sql/06_window_analytics.sql exactly
--      (the window only sees days that had completed trips).
--      p_zero_fill = TRUE first fills calendar days with no trips as 0, so
--      the window covers 7 calendar days (handover #8).
--    Six days before p_from are read so the first point has a full window.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_vehicle_revenue_ranking AS
WITH daily_revenue AS (
    SELECT
        vehicle_id,
        DATE(created_at) AS revenue_date,
        SUM(fare_amount) AS daily_total
    FROM trips
    WHERE status = 'COMPLETED'
    GROUP BY vehicle_id, DATE(created_at)
),
vehicle_ranking AS (
    SELECT
        vehicle_id,
        SUM(daily_total) AS total_revenue,
        DENSE_RANK() OVER (ORDER BY SUM(daily_total) DESC) AS revenue_rank
    FROM daily_revenue
    GROUP BY vehicle_id
)
SELECT
    r.vehicle_id,
    v.license_plate,
    v.class,
    r.total_revenue,
    r.revenue_rank
FROM vehicle_ranking r
JOIN vehicles v ON v.id = r.vehicle_id;

CREATE OR REPLACE FUNCTION fn_vehicle_revenue_trend(
    p_vehicle_id UUID,
    p_from       DATE,
    p_to         DATE,
    p_zero_fill  BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    revenue_date    DATE,
    daily_total     NUMERIC,
    moving_avg_7day NUMERIC,
    has_trips       BOOLEAN
)
LANGUAGE sql
STABLE
AS $$
    WITH daily_revenue AS (
        SELECT
            DATE(t.created_at) AS revenue_date,
            SUM(t.fare_amount) AS daily_total
        FROM trips t
        WHERE t.status = 'COMPLETED'
          AND t.vehicle_id = p_vehicle_id
          AND t.created_at >= (p_from - 6)
          AND t.created_at <  (p_to + 1)
        GROUP BY DATE(t.created_at)
    ),
    calendar AS (
        SELECT d::date AS revenue_date
        FROM generate_series(p_from - 6, p_to, INTERVAL '1 day') AS d
    ),
    series AS (
        SELECT
            c.revenue_date,
            COALESCE(dr.daily_total, 0) AS daily_total,
            dr.daily_total IS NOT NULL  AS has_trips
        FROM calendar c
        LEFT JOIN daily_revenue dr ON dr.revenue_date = c.revenue_date
        WHERE p_zero_fill OR dr.daily_total IS NOT NULL
    ),
    moving_avg AS (
        SELECT
            s.revenue_date,
            s.daily_total,
            ROUND(
                AVG(s.daily_total) OVER (
                    ORDER BY s.revenue_date
                    RANGE BETWEEN INTERVAL '6 days' PRECEDING AND CURRENT ROW
                ),
            2) AS moving_avg_7day,
            s.has_trips
        FROM series s
    )
    SELECT m.revenue_date, m.daily_total, m.moving_avg_7day, m.has_trips
    FROM moving_avg m
    WHERE m.revenue_date >= p_from
    ORDER BY m.revenue_date;
$$;
