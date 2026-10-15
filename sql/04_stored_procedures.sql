CREATE OR REPLACE PROCEDURE sp_atomic_booking(
    IN    p_rider_id    UUID,
    IN    p_vehicle_id  UUID,
    IN    p_fare_amount DECIMAL(10, 2),
    INOUT p_trip_id     UUID DEFAULT NULL,
    INOUT p_status      TEXT DEFAULT NULL
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_vehicle_active BOOLEAN;
    v_constraint     TEXT;
BEGIN
    -- Transaction control: callers must use autocommit (no surrounding BEGIN),
    -- otherwise this COMMIT raises "invalid transaction termination".
    COMMIT;
    SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;

    BEGIN
        -- [A2 fix] Procedure parameters ignore DECIMAL(10,2), so 10.005 used to
        -- debit 10.00 from the wallet but store a 10.01 fare. Round once here.
        p_fare_amount := ROUND(p_fare_amount, 2);

        -- [A2 fix] A negative fare used to surface as "insufficient wallet
        -- balance"; a zero fare committed without any wallet_audit_logs row.
        IF p_fare_amount IS NULL OR p_fare_amount <= 0 THEN
            RAISE EXCEPTION 'fare must be greater than 0.00'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;

        SELECT is_active INTO v_vehicle_active
          FROM vehicles WHERE id = p_vehicle_id FOR SHARE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'vehicle % not found', p_vehicle_id
                USING ERRCODE = 'no_data_found';
        END IF;

        IF NOT v_vehicle_active THEN
            RAISE EXCEPTION 'vehicle % is not active', p_vehicle_id
                USING ERRCODE = 'no_data_found';
        END IF;

        UPDATE riders
           SET wallet_balance = wallet_balance - p_fare_amount
         WHERE id = p_rider_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'rider % not found', p_rider_id
                USING ERRCODE = 'no_data_found';
        END IF;

        INSERT INTO trips (rider_id, vehicle_id, fare_amount, status)
        VALUES (p_rider_id, p_vehicle_id, p_fare_amount, 'REQUESTED')
        RETURNING id INTO p_trip_id;

        p_status := 'COMMITTED';

    EXCEPTION
        WHEN check_violation THEN
            -- [A2 fix] Only the wallet CHECK means "insufficient balance".
            GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
            IF v_constraint = 'riders_wallet_balance_nonnegative' THEN
                p_status := 'ROLLED_BACK: insufficient wallet balance';
            ELSE
                p_status := 'ROLLED_BACK: ' || SQLERRM;
            END IF;
            p_trip_id := NULL;
        WHEN invalid_parameter_value THEN
            p_status := 'ROLLED_BACK: ' || SQLERRM;
            p_trip_id := NULL;
        WHEN unique_violation THEN
            p_status := 'ROLLED_BACK: rider already has an active trip';
            p_trip_id := NULL;
        WHEN no_data_found THEN
            p_status := 'ROLLED_BACK: ' || SQLERRM;
            p_trip_id := NULL;
        WHEN serialization_failure THEN
            p_status := 'ROLLED_BACK: concurrent update, retry';
            p_trip_id := NULL;
    END;

    IF p_status = 'COMMITTED' THEN
        COMMIT;
    ELSE
        ROLLBACK;
    END IF;
END;
$$;