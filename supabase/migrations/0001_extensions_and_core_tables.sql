-- =============================================================================
-- OMNITRANSIT AI — MIGRATION 0001: EXTENSIONS, TABLES, INDEXES, TRIGGERS & RPCs
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 10.1 Profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'commuter'
        CHECK (role IN (
            'commuter',
            'city_admin',
            'operations_manager',
            'safety_operator'
        )),
    preferred_language TEXT DEFAULT 'en',
    preferred_currency TEXT DEFAULT 'INR',
    timezone TEXT DEFAULT 'Asia/Kolkata',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10.2 User Preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    preferred_modes TEXT[] DEFAULT ARRAY['bus','metro','walking'],
    max_walking_distance INTEGER DEFAULT 1500 CHECK (max_walking_distance > 0),
    max_budget NUMERIC(10,2) CHECK (max_budget IS NULL OR max_budget >= 0),
    saferoute_enabled BOOLEAN DEFAULT FALSE,
    weather_alerts_enabled BOOLEAN DEFAULT TRUE,
    eco_notifications_enabled BOOLEAN DEFAULT TRUE,
    accessibility_preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10.3 Transit Stops
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transit_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    name TEXT NOT NULL,
    stop_type TEXT NOT NULL CHECK (stop_type IN ('bus_stop', 'metro_station', 'train_station', 'mobility_hub')),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    city TEXT DEFAULT 'Bengaluru',
    accessibility_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transit_stops_location
ON transit_stops USING GIST(location);

-- -----------------------------------------------------------------------------
-- 10.4 Transit Routes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transit_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT,
    route_name TEXT NOT NULL,
    transport_mode TEXT NOT NULL CHECK (transport_mode IN ('bus', 'metro', 'train', 'walking', 'cycling', 'ebike')),
    route_geometry GEOGRAPHY(LINESTRING, 4326),
    start_stop_id UUID REFERENCES transit_stops(id),
    end_stop_id UUID REFERENCES transit_stops(id),
    operator_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transit_routes_geometry
ON transit_routes USING GIST(route_geometry);

-- -----------------------------------------------------------------------------
-- 10.5 Transit Schedule / Trips
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transit_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES transit_routes(id) ON DELETE CASCADE,
    service_date DATE,
    departure_time TIMESTAMPTZ,
    arrival_time TIMESTAMPTZ,
    frequency_minutes INTEGER CHECK (frequency_minutes IS NULL OR frequency_minutes > 0),
    available_seats INTEGER,
    status TEXT DEFAULT 'scheduled',
    source TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transit_trips_route
ON transit_trips(route_id, departure_time);

-- -----------------------------------------------------------------------------
-- 10.6 Fleet Vehicles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fleet_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES transit_routes(id),
    vehicle_number TEXT UNIQUE NOT NULL,
    transport_mode TEXT NOT NULL,
    current_location GEOGRAPHY(POINT, 4326),
    occupancy INTEGER DEFAULT 0 CHECK (occupancy >= 0),
    capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
    status TEXT DEFAULT 'active',
    last_location_update TIMESTAMPTZ,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_location
ON fleet_vehicles USING GIST(current_location);

-- -----------------------------------------------------------------------------
-- 10.7 Journeys
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    origin GEOGRAPHY(POINT, 4326) NOT NULL,
    destination GEOGRAPHY(POINT, 4326) NOT NULL,
    origin_label TEXT,
    destination_label TEXT,
    routing_preference TEXT NOT NULL CHECK (routing_preference IN ('cheapest', 'fastest', 'safest', 'eco', 'balanced')),
    saferoute_enabled BOOLEAN DEFAULT FALSE,
    estimated_cost NUMERIC(10,2) CHECK (estimated_cost >= 0),
    actual_cost NUMERIC(10,2) CHECK (actual_cost IS NULL OR actual_cost >= 0),
    estimated_duration INTEGER CHECK (estimated_duration >= 0),
    actual_duration INTEGER CHECK (actual_duration IS NULL OR actual_duration >= 0),
    estimated_distance NUMERIC(10,2) CHECK (estimated_distance >= 0),
    estimated_co2 NUMERIC(12,4) CHECK (estimated_co2 >= 0),
    baseline_co2 NUMERIC(12,4) CHECK (baseline_co2 >= 0),
    carbon_saved NUMERIC(12,4) CHECK (carbon_saved >= 0),
    status TEXT DEFAULT 'planned'
        CHECK (status IN (
            'planned',
            'active',
            'completed',
            'cancelled'
        )),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_journeys_user
ON journeys(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 10.8 Journey Segments
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS journey_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    transport_mode TEXT NOT NULL,
    start_location GEOGRAPHY(POINT, 4326),
    end_location GEOGRAPHY(POINT, 4326),
    route_geometry GEOGRAPHY(LINESTRING, 4326),
    distance_km NUMERIC(10,3) CHECK (distance_km >= 0),
    duration_minutes INTEGER CHECK (duration_minutes >= 0),
    cost NUMERIC(10,2) CHECK (cost >= 0),
    co2_emissions NUMERIC(12,4) CHECK (co2_emissions >= 0),
    safety_score NUMERIC(5,2) CHECK (safety_score >= 0 AND safety_score <= 100),
    weather_risk TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(journey_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_journey_segments_journey
ON journey_segments(journey_id, sequence_number);

-- -----------------------------------------------------------------------------
-- 10.9 Safety Indicators
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS safety_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    indicator_type TEXT NOT NULL,
    score NUMERIC(5,2) CHECK (score >= 0 AND score <= 100),
    description TEXT,
    confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 100),
    source TEXT,
    verification_status TEXT DEFAULT 'unverified',
    observed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_location
ON safety_indicators USING GIST(location);

-- -----------------------------------------------------------------------------
-- 10.10 Safety Zones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS safety_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name TEXT NOT NULL,
    zone_type TEXT NOT NULL,
    boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,
    risk_level TEXT NOT NULL,
    confidence NUMERIC(5,2) CHECK (confidence >= 0 AND confidence <= 100),
    source TEXT,
    verification_status TEXT DEFAULT 'unverified',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_zones_boundary
ON safety_zones USING GIST(boundary);

-- -----------------------------------------------------------------------------
-- 10.11 Weather Alerts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS weather_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_alert_id TEXT,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    title TEXT NOT NULL,
    description TEXT,
    affected_area GEOGRAPHY(POLYGON, 4326),
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    source TEXT,
    verification_status TEXT DEFAULT 'unverified',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weather_alerts_area
ON weather_alerts USING GIST(affected_area);

-- -----------------------------------------------------------------------------
-- 10.12 Flood Zones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS flood_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name TEXT NOT NULL,
    boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,
    risk_level TEXT NOT NULL CHECK (risk_level IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
    risk_score NUMERIC(5,2) CHECK (risk_score >= 0 AND risk_score <= 100),
    source TEXT,
    verified_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flood_zones_boundary
ON flood_zones USING GIST(boundary);

-- -----------------------------------------------------------------------------
-- 10.13 Emergency Contacts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    relationship TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user
ON emergency_contacts(user_id);

-- -----------------------------------------------------------------------------
-- 10.14 Emergency Incidents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    journey_id UUID REFERENCES journeys(id),
    current_location GEOGRAPHY(POINT, 4326),
    status TEXT DEFAULT 'active'
        CHECK (status IN (
            'active',
            'acknowledged',
            'resolved',
            'cancelled'
        )),
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    notification_status JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_active
ON emergency_incidents(status, triggered_at DESC);

-- -----------------------------------------------------------------------------
-- 10.15 Emergency Location Updates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_location_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES emergency_incidents(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy_meters NUMERIC(10,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_location_incident
ON emergency_location_updates(incident_id, recorded_at DESC);

-- -----------------------------------------------------------------------------
-- 10.16 Carbon Emission Factors
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emission_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_mode TEXT NOT NULL,
    co2_kg_per_passenger_km NUMERIC(12,6) NOT NULL CHECK (co2_kg_per_passenger_km >= 0),
    region TEXT,
    source TEXT,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10.17 Carbon Wallets
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carbon_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned NUMERIC(14,2) DEFAULT 0 CHECK (lifetime_earned >= 0),
    lifetime_redeemed NUMERIC(14,2) DEFAULT 0 CHECK (lifetime_redeemed >= 0),
    lifetime_co2_saved NUMERIC(14,4) DEFAULT 0 CHECK (lifetime_co2_saved >= 0),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10.18 Carbon Transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carbon_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES carbon_wallets(id),
    journey_id UUID REFERENCES journeys(id),
    transaction_type TEXT NOT NULL
        CHECK (transaction_type IN ('earn','redeem','adjustment')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    co2_saved NUMERIC(12,4) DEFAULT 0 CHECK (co2_saved >= 0),
    multiplier NUMERIC(8,3),
    description TEXT,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carbon_transactions_wallet
ON carbon_transactions(wallet_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 10.19 Eco Campaigns
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS eco_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name TEXT NOT NULL,
    description TEXT,
    multiplier NUMERIC(8,3) NOT NULL CHECK (multiplier >= 1.0),
    eligible_routes UUID[] DEFAULT '{}',
    eligible_modes TEXT[] DEFAULT '{}',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    daily_reward_limit NUMERIC(14,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10.20 Rewards
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_name TEXT NOT NULL,
    description TEXT,
    coin_cost NUMERIC(14,2) NOT NULL CHECK (coin_cost > 0),
    reward_type TEXT NOT NULL,
    stock INTEGER CHECK (stock IS NULL OR stock >= 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 10.21 Reward Redemptions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    reward_id UUID NOT NULL REFERENCES rewards(id),
    coins_spent NUMERIC(14,2) NOT NULL CHECK (coins_spent > 0),
    redemption_code TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user
ON reward_redemptions(user_id, created_at DESC);

-- -----------------------------------------------------------------------------
-- 10.22 Notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user
ON notifications(user_id, is_read, created_at DESC);

-- -----------------------------------------------------------------------------
-- 10.23 Audit Logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
ON audit_logs(created_at DESC);

-- =============================================================================
-- TRIGGERS & STORED PROCEDURES
-- =============================================================================

-- 1. Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_flood_zones_updated_at
BEFORE UPDATE ON flood_zones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_carbon_wallets_updated_at
BEFORE UPDATE ON carbon_wallets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2. Automatic Profile, Preferences, and Wallet provisioning upon user creation
CREATE OR REPLACE FUNCTION handle_new_user_provisioning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, email, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email,
        'commuter'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.carbon_wallets (user_id, balance, lifetime_earned, lifetime_redeemed, lifetime_co2_saved)
    VALUES (NEW.id, 0, 0, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- 3. Immutable Carbon Ledger Protection
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'carbon_transactions is an immutable ledger and cannot be updated or deleted';
END;
$$;

CREATE TRIGGER trg_immutable_carbon_transactions
BEFORE UPDATE OR DELETE ON carbon_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- 4. Atomic Journey Completion and Carbon Coin Credit Procedure
CREATE OR REPLACE FUNCTION complete_journey_and_credit_wallet(
    p_journey_id UUID,
    p_user_id UUID,
    p_co2_saved NUMERIC,
    p_coins_earned NUMERIC,
    p_multiplier NUMERIC,
    p_idempotency_key TEXT,
    p_description TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_wallet_id UUID;
    v_journey_status TEXT;
    v_new_balance NUMERIC;
BEGIN
    SELECT status INTO v_journey_status
    FROM journeys
    WHERE id = p_journey_id AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Journey not found or unauthorized';
    END IF;

    IF v_journey_status = 'completed' THEN
        RAISE EXCEPTION 'Journey is already completed';
    END IF;

    UPDATE journeys
    SET status = 'completed',
        completed_at = NOW(),
        carbon_saved = GREATEST(0, p_co2_saved)
    WHERE id = p_journey_id;

    SELECT id INTO v_wallet_id
    FROM carbon_wallets
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF p_coins_earned > 0 THEN
        INSERT INTO carbon_transactions (
            wallet_id,
            journey_id,
            transaction_type,
            amount,
            co2_saved,
            multiplier,
            description,
            idempotency_key
        ) VALUES (
            v_wallet_id,
            p_journey_id,
            'earn',
            ROUND(p_coins_earned, 2),
            GREATEST(0, p_co2_saved),
            p_multiplier,
            p_description,
            p_idempotency_key
        );

        UPDATE carbon_wallets
        SET balance = balance + ROUND(p_coins_earned, 2),
            lifetime_earned = lifetime_earned + ROUND(p_coins_earned, 2),
            lifetime_co2_saved = lifetime_co2_saved + GREATEST(0, p_co2_saved)
        WHERE id = v_wallet_id
        RETURNING balance INTO v_new_balance;
    ELSE
        SELECT balance INTO v_new_balance FROM carbon_wallets WHERE id = v_wallet_id;
    END IF;

    RETURN jsonb_build_object(
        'journey_id', p_journey_id,
        'coins_earned', ROUND(p_coins_earned, 2),
        'co2_saved', GREATEST(0, p_co2_saved),
        'new_balance', v_new_balance
    );
END;
$$;

-- 5. Sensitive Location Data Retention Procedure (Purge resolved emergency location logs older than 30 days)
CREATE OR REPLACE FUNCTION purge_expired_emergency_locations()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM emergency_location_updates elu
    USING emergency_incidents ei
    WHERE elu.incident_id = ei.id
      AND ei.status IN ('resolved', 'cancelled')
      AND elu.recorded_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

-- 6. Analytics Views
CREATE OR REPLACE VIEW v_city_sustainability_summary AS
SELECT
    COUNT(id) FILTER (WHERE status = 'completed') AS completed_journeys,
    COALESCE(SUM(carbon_saved) FILTER (WHERE status = 'completed'), 0) AS total_co2_saved_kg,
    COALESCE(AVG(estimated_duration) FILTER (WHERE status = 'completed'), 0) AS avg_journey_duration_mins
FROM journeys;
