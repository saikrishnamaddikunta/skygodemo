-- =============================================================================
-- OMNITRANSIT AI — SUPABASE CLOUD POSTGRESQL INITIAL SCHEMA MIGRATION (001)
-- Includes:
--   1. PostGIS & pgcrypto Extensions
--   2. All 23 Core Tables, Constraints & Spatial/B-Tree Indexes
--   3. Triggers, Security-Definer Procedures & Immutable Ledger Protections
--   4. Row Level Security (RLS) Policies for Commuters & Administrative Roles
--   5. Initial Regional Seed Data (Bengaluru Multi-Modal Network, INR, IST)
-- =============================================================================

BEGIN;

-- =============================================================================
-- SECTION 1: EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- SECTION 2: CORE TABLES & INDEXES
-- =============================================================================

-- 10.1 Profiles
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

-- 10.2 User Preferences
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

-- 10.3 Transit Stops
CREATE TABLE IF NOT EXISTS transit_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    name TEXT NOT NULL,
    stop_type TEXT NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    city TEXT DEFAULT 'Bengaluru',
    accessibility_info JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transit_stops_location
ON transit_stops USING GIST(location);

-- 10.4 Transit Routes
CREATE TABLE IF NOT EXISTS transit_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT UNIQUE,
    route_name TEXT NOT NULL,
    transport_mode TEXT NOT NULL,
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

-- 10.5 Transit Schedule / Trips
CREATE TABLE IF NOT EXISTS transit_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES transit_routes(id) ON DELETE CASCADE,
    service_date DATE,
    departure_time TIMESTAMPTZ,
    arrival_time TIMESTAMPTZ,
    frequency_minutes INTEGER,
    available_seats INTEGER,
    status TEXT DEFAULT 'scheduled',
    source TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transit_trips_route
ON transit_trips(route_id, departure_time);

-- 10.6 Fleet Vehicles
CREATE TABLE IF NOT EXISTS fleet_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES transit_routes(id),
    vehicle_number TEXT UNIQUE NOT NULL,
    transport_mode TEXT NOT NULL,
    current_location GEOGRAPHY(POINT, 4326),
    occupancy INTEGER DEFAULT 0,
    capacity INTEGER,
    status TEXT DEFAULT 'active',
    last_location_update TIMESTAMPTZ,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fleet_location
ON fleet_vehicles USING GIST(current_location);

-- 10.7 Journeys
CREATE TABLE IF NOT EXISTS journeys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    origin GEOGRAPHY(POINT, 4326) NOT NULL,
    destination GEOGRAPHY(POINT, 4326) NOT NULL,
    origin_label TEXT,
    destination_label TEXT,
    routing_preference TEXT NOT NULL,
    saferoute_enabled BOOLEAN DEFAULT FALSE,
    estimated_cost NUMERIC(10,2),
    actual_cost NUMERIC(10,2),
    estimated_duration INTEGER,
    actual_duration INTEGER,
    estimated_distance NUMERIC(10,2),
    estimated_co2 NUMERIC(12,4),
    baseline_co2 NUMERIC(12,4),
    carbon_saved NUMERIC(12,4),
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

-- 10.8 Journey Segments
CREATE TABLE IF NOT EXISTS journey_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    journey_id UUID NOT NULL REFERENCES journeys(id) ON DELETE CASCADE,
    sequence_number INTEGER NOT NULL,
    transport_mode TEXT NOT NULL,
    start_location GEOGRAPHY(POINT, 4326),
    end_location GEOGRAPHY(POINT, 4326),
    route_geometry GEOGRAPHY(LINESTRING, 4326),
    distance_km NUMERIC(10,3),
    duration_minutes INTEGER,
    cost NUMERIC(10,2),
    co2_emissions NUMERIC(12,4),
    safety_score NUMERIC(5,2),
    weather_risk TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(journey_id, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_journey_segments_journey
ON journey_segments(journey_id, sequence_number);

-- 10.9 Safety Indicators
CREATE TABLE IF NOT EXISTS safety_indicators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    indicator_type TEXT NOT NULL,
    score NUMERIC(5,2),
    description TEXT,
    confidence NUMERIC(5,2),
    source TEXT,
    verification_status TEXT DEFAULT 'unverified',
    observed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_location
ON safety_indicators USING GIST(location);

-- 10.10 Safety Zones
CREATE TABLE IF NOT EXISTS safety_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name TEXT NOT NULL,
    zone_type TEXT NOT NULL,
    boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,
    risk_level TEXT NOT NULL,
    confidence NUMERIC(5,2),
    source TEXT,
    verification_status TEXT DEFAULT 'unverified',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_safety_zones_boundary
ON safety_zones USING GIST(boundary);

-- 10.11 Weather Alerts
CREATE TABLE IF NOT EXISTS weather_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_alert_id TEXT UNIQUE,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
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

-- 10.12 Flood Zones
CREATE TABLE IF NOT EXISTS flood_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name TEXT UNIQUE NOT NULL,
    boundary GEOGRAPHY(POLYGON, 4326) NOT NULL,
    risk_level TEXT NOT NULL,
    risk_score NUMERIC(5,2),
    source TEXT,
    verified_by UUID REFERENCES profiles(id),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flood_zones_boundary
ON flood_zones USING GIST(boundary);

-- 10.13 Emergency Contacts
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

-- 10.14 Emergency Incidents
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

-- 10.15 Emergency Location Updates
CREATE TABLE IF NOT EXISTS emergency_location_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID NOT NULL REFERENCES emergency_incidents(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy_meters NUMERIC(10,2),
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_location_incident
ON emergency_location_updates(incident_id, recorded_at DESC);

-- 10.16 Carbon Emission Factors
CREATE TABLE IF NOT EXISTS emission_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_mode TEXT UNIQUE NOT NULL,
    co2_kg_per_passenger_km NUMERIC(12,6) NOT NULL,
    region TEXT,
    source TEXT,
    effective_from DATE NOT NULL,
    effective_to DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.17 Carbon Wallets
CREATE TABLE IF NOT EXISTS carbon_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned NUMERIC(14,2) DEFAULT 0,
    lifetime_redeemed NUMERIC(14,2) DEFAULT 0,
    lifetime_co2_saved NUMERIC(14,4) DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.18 Carbon Transactions
CREATE TABLE IF NOT EXISTS carbon_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES carbon_wallets(id),
    journey_id UUID REFERENCES journeys(id),
    transaction_type TEXT NOT NULL
        CHECK (transaction_type IN ('earn','redeem','adjustment')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    co2_saved NUMERIC(12,4) DEFAULT 0,
    multiplier NUMERIC(8,3),
    description TEXT,
    idempotency_key TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_carbon_transactions_wallet
ON carbon_transactions(wallet_id, created_at DESC);

-- 10.19 Eco Campaigns
CREATE TABLE IF NOT EXISTS eco_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_name TEXT UNIQUE NOT NULL,
    description TEXT,
    multiplier NUMERIC(8,3) NOT NULL,
    eligible_routes UUID[] DEFAULT '{}',
    eligible_modes TEXT[] DEFAULT '{}',
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    daily_reward_limit NUMERIC(14,2),
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.20 Rewards
CREATE TABLE IF NOT EXISTS rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reward_name TEXT UNIQUE NOT NULL,
    description TEXT,
    coin_cost NUMERIC(14,2) NOT NULL,
    reward_type TEXT NOT NULL,
    stock INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10.21 Reward Redemptions
CREATE TABLE IF NOT EXISTS reward_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    reward_id UUID NOT NULL REFERENCES rewards(id),
    coins_spent NUMERIC(14,2) NOT NULL,
    redemption_code TEXT UNIQUE,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user
ON reward_redemptions(user_id, created_at DESC);

-- 10.22 Notifications
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

-- 10.23 Audit Logs
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
-- SECTION 3: TRIGGERS, STORED PROCEDURES & VIEWS
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_user_preferences_updated_at ON user_preferences;
CREATE TRIGGER trg_user_preferences_updated_at
BEFORE UPDATE ON user_preferences
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_flood_zones_updated_at ON flood_zones;
CREATE TRIGGER trg_flood_zones_updated_at
BEFORE UPDATE ON flood_zones
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_carbon_wallets_updated_at ON carbon_wallets;
CREATE TRIGGER trg_carbon_wallets_updated_at
BEFORE UPDATE ON carbon_wallets
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Automatic Profile, Preferences, and Carbon Wallet provisioning on Auth Signup
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user_provisioning();

-- Immutable Carbon Ledger Enforcement
CREATE OR REPLACE FUNCTION prevent_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'carbon_transactions is an immutable ledger and cannot be updated or deleted';
END;
$$;

DROP TRIGGER IF EXISTS trg_immutable_carbon_transactions ON carbon_transactions;
CREATE TRIGGER trg_immutable_carbon_transactions
BEFORE UPDATE OR DELETE ON carbon_transactions
FOR EACH ROW EXECUTE FUNCTION prevent_ledger_mutation();

-- Transactional Journey Completion & Carbon Coin Credit Procedure
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

-- Location Retention Procedure (Purge resolved emergency location logs older than 30 days)
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

CREATE OR REPLACE VIEW v_city_sustainability_summary AS
SELECT
    COUNT(id) FILTER (WHERE status = 'completed') AS completed_journeys,
    COALESCE(SUM(carbon_saved) FILTER (WHERE status = 'completed'), 0) AS total_co2_saved_kg,
    COALESCE(AVG(estimated_duration) FILTER (WHERE status = 'completed'), 0) AS avg_journey_duration_mins
FROM journeys;

-- =============================================================================
-- SECTION 4: ROW LEVEL SECURITY (RLS) & DATA ISOLATION POLICIES
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE transit_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE fleet_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE flood_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_location_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE emission_factors ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE carbon_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE eco_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND COALESCE(get_my_role(), 'commuter') <> 'city_admin' THEN
        RAISE EXCEPTION 'Unauthorized role modification attempt';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_self_escalation ON profiles;
CREATE TRIGGER trg_prevent_role_self_escalation
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_role_self_escalation();

-- Profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id OR get_my_role() = 'city_admin');

DROP POLICY IF EXISTS "Users can update own permitted profile fields" ON profiles;
CREATE POLICY "Users can update own permitted profile fields"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- User Preferences
DROP POLICY IF EXISTS "Users can read own preferences" ON user_preferences;
CREATE POLICY "Users can read own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Publicly Readable Transit, Weather, Flood, Campaigns & Rewards Catalog
DROP POLICY IF EXISTS "Public can read active transit stops" ON transit_stops;
CREATE POLICY "Public can read active transit stops"
ON transit_stops FOR SELECT
USING (is_active = TRUE OR get_my_role() IN ('city_admin', 'operations_manager'));

DROP POLICY IF EXISTS "Admins can manage transit stops" ON transit_stops;
CREATE POLICY "Admins can manage transit stops"
ON transit_stops FOR ALL
USING (get_my_role() IN ('city_admin', 'operations_manager'));

DROP POLICY IF EXISTS "Public can read active transit routes" ON transit_routes;
CREATE POLICY "Public can read active transit routes"
ON transit_routes FOR SELECT
USING (is_active = TRUE OR get_my_role() IN ('city_admin', 'operations_manager'));

DROP POLICY IF EXISTS "Admins can manage transit routes" ON transit_routes;
CREATE POLICY "Admins can manage transit routes"
ON transit_routes FOR ALL
USING (get_my_role() IN ('city_admin', 'operations_manager'));

DROP POLICY IF EXISTS "Public can read transit trips" ON transit_trips;
CREATE POLICY "Public can read transit trips"
ON transit_trips FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "Operations managers can manage fleet vehicles" ON fleet_vehicles;
CREATE POLICY "Operations managers can manage fleet vehicles"
ON fleet_vehicles FOR ALL
USING (get_my_role() IN ('city_admin', 'operations_manager'));

DROP POLICY IF EXISTS "Authenticated users can read active fleet vehicles" ON fleet_vehicles;
CREATE POLICY "Authenticated users can read active fleet vehicles"
ON fleet_vehicles FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public can read verified weather alerts" ON weather_alerts;
CREATE POLICY "Public can read verified weather alerts"
ON weather_alerts FOR SELECT
USING (verification_status = 'verified' OR get_my_role() IN ('city_admin', 'operations_manager', 'safety_operator'));

DROP POLICY IF EXISTS "Public can read active flood zones" ON flood_zones;
CREATE POLICY "Public can read active flood zones"
ON flood_zones FOR SELECT
USING (is_active = TRUE OR get_my_role() IN ('city_admin', 'operations_manager', 'safety_operator'));

DROP POLICY IF EXISTS "Admins can manage flood zones" ON flood_zones;
CREATE POLICY "Admins can manage flood zones"
ON flood_zones FOR ALL
USING (get_my_role() IN ('city_admin', 'operations_manager'));

DROP POLICY IF EXISTS "Authenticated users can read safety indicators and zones" ON safety_indicators;
CREATE POLICY "Authenticated users can read safety indicators and zones"
ON safety_indicators FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Safety operators and admins can manage safety indicators" ON safety_indicators;
CREATE POLICY "Safety operators and admins can manage safety indicators"
ON safety_indicators FOR ALL
USING (get_my_role() IN ('city_admin', 'safety_operator'));

DROP POLICY IF EXISTS "Authenticated users can read safety zones" ON safety_zones;
CREATE POLICY "Authenticated users can read safety zones"
ON safety_zones FOR SELECT
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Public can read emission factors" ON emission_factors;
CREATE POLICY "Public can read emission factors"
ON emission_factors FOR SELECT
USING (TRUE);

DROP POLICY IF EXISTS "City admins can manage emission factors" ON emission_factors;
CREATE POLICY "City admins can manage emission factors"
ON emission_factors FOR ALL
USING (get_my_role() = 'city_admin');

DROP POLICY IF EXISTS "Public can read active eco campaigns" ON eco_campaigns;
CREATE POLICY "Public can read active eco campaigns"
ON eco_campaigns FOR SELECT
USING (is_active = TRUE OR get_my_role() = 'city_admin');

DROP POLICY IF EXISTS "City admins can manage eco campaigns" ON eco_campaigns;
CREATE POLICY "City admins can manage eco campaigns"
ON eco_campaigns FOR ALL
USING (get_my_role() = 'city_admin');

DROP POLICY IF EXISTS "Public can read active rewards catalog" ON rewards;
CREATE POLICY "Public can read active rewards catalog"
ON rewards FOR SELECT
USING (is_active = TRUE OR get_my_role() = 'city_admin');

DROP POLICY IF EXISTS "City admins can manage rewards catalog" ON rewards;
CREATE POLICY "City admins can manage rewards catalog"
ON rewards FOR ALL
USING (get_my_role() = 'city_admin');

-- Journeys & Segments Isolation
DROP POLICY IF EXISTS "Commuters can read own journeys" ON journeys;
CREATE POLICY "Commuters can read own journeys"
ON journeys FOR SELECT
USING (auth.uid() = user_id OR get_my_role() = 'city_admin');

DROP POLICY IF EXISTS "Commuters can create own journeys" ON journeys;
CREATE POLICY "Commuters can create own journeys"
ON journeys FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Commuters can update own journeys" ON journeys;
CREATE POLICY "Commuters can update own journeys"
ON journeys FOR UPDATE
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Commuters can read own journey segments" ON journey_segments;
CREATE POLICY "Commuters can read own journey segments"
ON journey_segments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM journeys j
        WHERE j.id = journey_segments.journey_id
          AND (j.user_id = auth.uid() OR get_my_role() = 'city_admin')
    )
);

-- Emergency Contacts, Incidents & Location Updates Isolation
DROP POLICY IF EXISTS "Commuters manage own emergency contacts" ON emergency_contacts;
CREATE POLICY "Commuters manage own emergency contacts"
ON emergency_contacts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Commuters and safety operators can access emergency incidents" ON emergency_incidents;
CREATE POLICY "Commuters and safety operators can access emergency incidents"
ON emergency_incidents FOR SELECT
USING (auth.uid() = user_id OR get_my_role() IN ('city_admin', 'safety_operator'));

DROP POLICY IF EXISTS "Commuters can create own emergency incidents" ON emergency_incidents;
CREATE POLICY "Commuters can create own emergency incidents"
ON emergency_incidents FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Commuters and safety operators can update emergency incidents" ON emergency_incidents;
CREATE POLICY "Commuters and safety operators can update emergency incidents"
ON emergency_incidents FOR UPDATE
USING (auth.uid() = user_id OR get_my_role() IN ('city_admin', 'safety_operator'));

DROP POLICY IF EXISTS "Restricted access to emergency location updates" ON emergency_location_updates;
CREATE POLICY "Restricted access to emergency location updates"
ON emergency_location_updates FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM emergency_incidents ei
        WHERE ei.id = emergency_location_updates.incident_id
          AND (ei.user_id = auth.uid() OR get_my_role() IN ('city_admin', 'safety_operator'))
    )
);

DROP POLICY IF EXISTS "Incident owner can insert emergency location updates" ON emergency_location_updates;
CREATE POLICY "Incident owner can insert emergency location updates"
ON emergency_location_updates FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM emergency_incidents ei
        WHERE ei.id = emergency_location_updates.incident_id
          AND ei.user_id = auth.uid()
          AND ei.status IN ('active', 'acknowledged')
    )
);

-- Carbon Wallets, Transactions & Redemptions (Strict Read-Only for Clients)
DROP POLICY IF EXISTS "Commuters can read own carbon wallet" ON carbon_wallets;
CREATE POLICY "Commuters can read own carbon wallet"
ON carbon_wallets FOR SELECT
USING (auth.uid() = user_id OR get_my_role() = 'city_admin');

DROP POLICY IF EXISTS "Commuters can read own carbon transactions" ON carbon_transactions;
CREATE POLICY "Commuters can read own carbon transactions"
ON carbon_transactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM carbon_wallets cw
        WHERE cw.id = carbon_transactions.wallet_id
          AND (cw.user_id = auth.uid() OR get_my_role() = 'city_admin')
    )
);

DROP POLICY IF EXISTS "Commuters can read own reward redemptions" ON reward_redemptions;
CREATE POLICY "Commuters can read own reward redemptions"
ON reward_redemptions FOR SELECT
USING (auth.uid() = user_id OR get_my_role() = 'city_admin');

-- Notifications & Audit Logs
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark own notifications read" ON notifications;
CREATE POLICY "Users can mark own notifications read"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only city admins can read audit logs" ON audit_logs;
CREATE POLICY "Only city admins can read audit logs"
ON audit_logs FOR SELECT
USING (get_my_role() = 'city_admin');

-- =============================================================================
-- SECTION 5: SEED DATA (BENGALURU URBAN MOBILITY NETWORK)
-- =============================================================================

-- 5.1 Emission Factors
INSERT INTO emission_factors (transport_mode, co2_kg_per_passenger_km, region, source, effective_from)
VALUES
    ('petrol_car', 0.192000, 'IN-KA', 'India GHG Program / WRI India', '2025-01-01'),
    ('diesel_car', 0.171000, 'IN-KA', 'India GHG Program / WRI India', '2025-01-01'),
    ('bus', 0.105000, 'IN-KA', 'BMTC / CEEW Urban Bus Benchmark', '2025-01-01'),
    ('metro', 0.035000, 'IN-KA', 'BMRCL Namma Metro Sustainability Report', '2025-01-01'),
    ('train', 0.041000, 'IN-KA', 'Indian Railways Suburban Benchmark', '2025-01-01'),
    ('ebike', 0.015000, 'IN-KA', 'Yulu / Grid-Adjusted Micro-Mobility', '2025-01-01'),
    ('walking', 0.000000, 'IN-KA', 'Zero Operational Emissions', '2025-01-01'),
    ('cycling', 0.000000, 'IN-KA', 'Zero Operational Emissions', '2025-01-01')
ON CONFLICT (transport_mode) DO NOTHING;

-- 5.2 Transit Stops
INSERT INTO transit_stops (external_id, name, stop_type, location, city, accessibility_info, is_active, source)
VALUES
    ('STOP-MAJESTIC', 'Majestic Kempegowda Interchange', 'metro_station', ST_GeogFromText('SRID=4326;POINT(77.5713 12.9767)'), 'Bengaluru', '{"wheelchair": true, "elevator": true, "tactile_paving": true}', TRUE, 'BMRCL/BMTC'),
    ('STOP-CUBBON', 'Cubbon Park Metro & Bus Hub', 'metro_station', ST_GeogFromText('SRID=4326;POINT(77.5955 12.9780)'), 'Bengaluru', '{"wheelchair": true, "elevator": true, "tactile_paving": true}', TRUE, 'BMRCL'),
    ('STOP-MG-ROAD', 'MG Road Metro & Mobility Hub', 'metro_station', ST_GeogFromText('SRID=4326;POINT(77.6068 12.9756)'), 'Bengaluru', '{"wheelchair": true, "elevator": true, "tactile_paving": true}', TRUE, 'BMRCL'),
    ('STOP-INDIRANAGAR', 'Indiranagar Metro Station', 'metro_station', ST_GeogFromText('SRID=4326;POINT(77.6387 12.9784)'), 'Bengaluru', '{"wheelchair": true, "elevator": true}', TRUE, 'BMRCL'),
    ('STOP-DOMLUR', 'Domlur TTMC Transit Hub', 'bus_stop', ST_GeogFromText('SRID=4326;POINT(77.6382 12.9610)'), 'Bengaluru', '{"wheelchair": true, "shelter": true}', TRUE, 'BMTC'),
    ('STOP-KORAMANGALA', 'Koramangala Sony World Hub', 'mobility_hub', ST_GeogFromText('SRID=4326;POINT(77.6245 12.9352)'), 'Bengaluru', '{"wheelchair": true, "shelter": true}', TRUE, 'BMTC/Yulu'),
    ('STOP-JAYANAGAR', 'Jayanagar 4th Block TTMC', 'metro_station', ST_GeogFromText('SRID=4326;POINT(77.5839 12.9299)'), 'Bengaluru', '{"wheelchair": true, "elevator": true}', TRUE, 'BMRCL/BMTC'),
    ('STOP-SILK-BOARD', 'Silk Board Multi-Modal Junction', 'bus_stop', ST_GeogFromText('SRID=4326;POINT(77.6227 12.9172)'), 'Bengaluru', '{"wheelchair": false, "shelter": true}', TRUE, 'BMTC'),
    ('STOP-BELLANDUR', 'Bellandur EcoSpace ORR Bus Stop', 'bus_stop', ST_GeogFromText('SRID=4326;POINT(77.6784 12.9304)'), 'Bengaluru', '{"wheelchair": true, "shelter": true}', TRUE, 'BMTC'),
    ('STOP-WHITEFIELD', 'Whitefield (Kadugodi) Metro Terminal', 'metro_station', ST_GeogFromText('SRID=4326;POINT(77.7100 12.9850)'), 'Bengaluru', '{"wheelchair": true, "elevator": true}', TRUE, 'BMRCL')
ON CONFLICT (external_id) DO NOTHING;

-- 5.3 Transit Routes
INSERT INTO transit_routes (external_id, route_name, transport_mode, route_geometry, operator_name, is_active, source)
VALUES
    ('NML-PURPLE-W1', 'Namma Metro Purple Line (Majestic -> Cubbon Park)', 'metro', ST_GeogFromText('SRID=4326;LINESTRING(77.5713 12.9767, 77.5955 12.9780)'), 'BMRCL Namma Metro', TRUE, 'BMRCL'),
    ('NML-PURPLE-W2', 'Namma Metro Purple Line (Cubbon Park -> MG Road)', 'metro', ST_GeogFromText('SRID=4326;LINESTRING(77.5955 12.9780, 77.6068 12.9756)'), 'BMRCL Namma Metro', TRUE, 'BMRCL'),
    ('NML-PURPLE-E1', 'Namma Metro Purple Line (MG Road -> Indiranagar)', 'metro', ST_GeogFromText('SRID=4326;LINESTRING(77.6068 12.9756, 77.6387 12.9784)'), 'BMRCL Namma Metro', TRUE, 'BMRCL'),
    ('BMTC-12-OFFPEAK', 'BMTC Route 12 Green Feeder (Indiranagar -> Domlur -> Koramangala)', 'bus', ST_GeogFromText('SRID=4326;LINESTRING(77.6387 12.9784, 77.6382 12.9610, 77.6245 12.9352)'), 'BMTC Electric Fleet', TRUE, 'BMTC'),
    ('BMTC-201R', 'BMTC Route 201R Direct (MG Road -> Koramangala)', 'bus', ST_GeogFromText('SRID=4326;LINESTRING(77.6068 12.9756, 77.6245 12.9352)'), 'BMTC', TRUE, 'BMTC'),
    ('BMTC-500D', 'BMTC ORR Express 500D (Silk Board -> Bellandur -> Whitefield)', 'bus', ST_GeogFromText('SRID=4326;LINESTRING(77.6227 12.9172, 77.6784 12.9304, 77.7100 12.9850)'), 'BMTC ORR Express', TRUE, 'BMTC'),
    ('YULU-EB-01', 'Yulu E-Bike Greenway (Indiranagar -> Koramangala)', 'ebike', ST_GeogFromText('SRID=4326;LINESTRING(77.6387 12.9784, 77.6245 12.9352)'), 'Yulu Smart Mobility', TRUE, 'Yulu')
ON CONFLICT (external_id) DO NOTHING;

-- 5.4 Fleet Vehicles
INSERT INTO fleet_vehicles (vehicle_number, transport_mode, current_location, occupancy, capacity, status, last_location_update, source)
VALUES
    ('KA-01-F-9212', 'bus', ST_GeogFromText('SRID=4326;POINT(77.6382 12.9610)'), 18, 45, 'active', NOW(), 'BMTC AVL'),
    ('BMRCL-TP-204', 'metro', ST_GeogFromText('SRID=4326;POINT(77.6215 12.9768)'), 410, 1200, 'active', NOW(), 'BMRCL CBTC'),
    ('KA-01-FA-4501', 'bus', ST_GeogFromText('SRID=4326;POINT(77.6784 12.9304)'), 22, 50, 'active', NOW(), 'BMTC AVL'),
    ('YULU-BLR-883', 'ebike', ST_GeogFromText('SRID=4326;POINT(77.6387 12.9784)'), 1, 1, 'active', NOW(), 'Yulu IoT')
ON CONFLICT (vehicle_number) DO NOTHING;

-- 5.5 Safety Indicators
INSERT INTO safety_indicators (location, indicator_type, score, description, confidence, source, verification_status, observed_at)
VALUES
    (ST_GeogFromText('SRID=4326;POINT(77.6068 12.9756)'), 'street_lighting', 95, 'High-lumen smart LED street lighting along MG Road and Brigade Road', 94, 'BBMP Smart City Sensor', 'verified', NOW()),
    (ST_GeogFromText('SRID=4326;POINT(77.6387 12.9784)'), 'cctv_infrastructure', 91, 'BMRCL & Bengaluru Safe City CCTV active coverage', 92, 'Safe City Command Center', 'verified', NOW()),
    (ST_GeogFromText('SRID=4326;POINT(77.6245 12.9352)'), 'emergency_infrastructure', 88, '24x7 Hoysala Patrol Point & Panic Call Box within 120m', 90, 'Bengaluru City Police', 'verified', NOW()),
    (ST_GeogFromText('SRID=4326;POINT(77.6227 12.9172)'), 'road_accessibility', 65, 'Flyover construction narrowing pedestrian walkway at Silk Board', 84, 'Traffic Police Advisory', 'verified', NOW());

-- 5.6 Flood Zones
INSERT INTO flood_zones (zone_name, boundary, risk_level, risk_score, source, is_active)
VALUES
    (
        'Bellandur - Outer Ring Road Low-Lying Basin',
        ST_GeogFromText('SRID=4326;POLYGON((77.660 12.922, 77.690 12.922, 77.690 12.942, 77.660 12.942, 77.660 12.922))'),
        'HIGH',
        84.0,
        'BBMP / KSNDMC Flood Monitoring Cell',
        TRUE
    ),
    (
        'Koramangala Direct Storm Drain Underpass',
        ST_GeogFromText('SRID=4326;POLYGON((77.610 12.950, 77.622 12.950, 77.622 12.962, 77.610 12.962, 77.610 12.950))'),
        'MODERATE',
        62.0,
        'KSNDMC Historical Waterlogging Layer',
        TRUE
    )
ON CONFLICT (zone_name) DO NOTHING;

-- 5.7 Weather Alerts
INSERT INTO weather_alerts (provider_alert_id, alert_type, severity, title, description, affected_area, start_time, end_time, source, verification_status)
VALUES
    (
        'IMD-KA-BLR-2026-01',
        'rainfall',
        'MODERATE',
        'Localized Afternoon Thundershowers & Low-Lying Waterlogging Watch',
        'Moderate rainfall (12-22 mm/hr) forecasted across eastern and south-eastern corridors.',
        ST_GeogFromText('SRID=4326;POLYGON((77.660 12.922, 77.690 12.922, 77.690 12.942, 77.660 12.942, 77.660 12.922))'),
        NOW(),
        NOW() + INTERVAL '14 days',
        'IMD / OpenWeather Adapter',
        'verified'
    )
ON CONFLICT (provider_alert_id) DO NOTHING;

-- 5.8 Eco Campaigns
INSERT INTO eco_campaigns (campaign_name, description, multiplier, eligible_modes, start_time, end_time, daily_reward_limit, is_active)
VALUES
    (
        'BMTC Route 12 Off-Peak Green Boost',
        'Earn 1.5x Carbon Coins when choosing BMTC Route 12 or underutilized public buses during off-peak hours.',
        1.500,
        ARRAY['bus'],
        NOW() - INTERVAL '7 days',
        NOW() + INTERVAL '60 days',
        500.00,
        TRUE
    ),
    (
        'Namma Metro + Micro-Mobility Zero-Carbon Combo',
        'Combine Namma Metro with Walking or E-Bike transfers for a 1.75x Carbon Coin multiplier.',
        1.750,
        ARRAY['metro', 'ebike', 'walking'],
        NOW() - INTERVAL '7 days',
        NOW() + INTERVAL '60 days',
        500.00,
        TRUE
    )
ON CONFLICT (campaign_name) DO NOTHING;

-- 5.9 Rewards Catalog
INSERT INTO rewards (reward_name, description, coin_cost, reward_type, stock, is_active)
VALUES
    ('Namma Metro ₹50 Smart Card Recharge Voucher', 'Redeemable demo voucher code for ₹50 rebate on BMRCL Namma Metro top-up.', 40.00, 'transit_discount', 250, TRUE),
    ('BMTC Vajra AC Day Pass 25% Discount', 'Digital coupon code for 25% off a BMTC daily transit pass.', 30.00, 'transit_discount', 500, TRUE),
    ('Yulu E-Bike 30-Minute Free Unlock Voucher', 'Zero-emission last-mile micro-mobility ride credit.', 25.00, 'mobility_voucher', 400, TRUE),
    ('Bengaluru Green Commuter Champion Badge', 'Verified profile sustainability badge for choosing low-carbon multi-modal journeys.', 20.00, 'digital_badge', NULL, TRUE)
ON CONFLICT (reward_name) DO NOTHING;

COMMIT;
