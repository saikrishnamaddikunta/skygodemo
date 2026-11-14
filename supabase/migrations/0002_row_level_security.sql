-- =============================================================================
-- OMNITRANSIT AI — MIGRATION 0002: ROW LEVEL SECURITY (RLS) & DATA ISOLATION
-- =============================================================================

-- Enable RLS across all tables
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

-- Helper function to retrieve current user's role securely
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- Prevent commuters from escalating their own role via UPDATE
CREATE OR REPLACE FUNCTION prevent_role_self_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role AND get_my_role() <> 'city_admin' THEN
        RAISE EXCEPTION 'Unauthorized role modification attempt';
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_role_self_escalation
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_role_self_escalation();

-- -----------------------------------------------------------------------------
-- 1. Profiles Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can read own profile"
ON profiles FOR SELECT
USING (auth.uid() = id OR get_my_role() = 'city_admin');

CREATE POLICY "Users can update own permitted profile fields"
ON profiles FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- 2. User Preferences Policies
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can read own preferences"
ON user_preferences FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
ON user_preferences FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
ON user_preferences FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 3. Publicly Readable Transit, Weather, Flood, Campaigns & Rewards Catalog
-- -----------------------------------------------------------------------------
CREATE POLICY "Public can read active transit stops"
ON transit_stops FOR SELECT
USING (is_active = TRUE OR get_my_role() IN ('city_admin', 'operations_manager'));

CREATE POLICY "Admins can manage transit stops"
ON transit_stops FOR ALL
USING (get_my_role() IN ('city_admin', 'operations_manager'));

CREATE POLICY "Public can read active transit routes"
ON transit_routes FOR SELECT
USING (is_active = TRUE OR get_my_role() IN ('city_admin', 'operations_manager'));

CREATE POLICY "Admins can manage transit routes"
ON transit_routes FOR ALL
USING (get_my_role() IN ('city_admin', 'operations_manager'));

CREATE POLICY "Public can read transit trips"
ON transit_trips FOR SELECT
USING (TRUE);

CREATE POLICY "Operations managers can manage fleet vehicles"
ON fleet_vehicles FOR ALL
USING (get_my_role() IN ('city_admin', 'operations_manager'));

CREATE POLICY "Authenticated users can read active fleet vehicles"
ON fleet_vehicles FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can read verified weather alerts"
ON weather_alerts FOR SELECT
USING (verification_status = 'verified' OR get_my_role() IN ('city_admin', 'operations_manager', 'safety_operator'));

CREATE POLICY "Public can read active flood zones"
ON flood_zones FOR SELECT
USING (is_active = TRUE OR get_my_role() IN ('city_admin', 'operations_manager', 'safety_operator'));

CREATE POLICY "Admins can manage flood zones"
ON flood_zones FOR ALL
USING (get_my_role() IN ('city_admin', 'operations_manager'));

CREATE POLICY "Authenticated users can read safety indicators and zones"
ON safety_indicators FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Safety operators and admins can manage safety indicators"
ON safety_indicators FOR ALL
USING (get_my_role() IN ('city_admin', 'safety_operator'));

CREATE POLICY "Authenticated users can read safety zones"
ON safety_zones FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Public can read emission factors"
ON emission_factors FOR SELECT
USING (TRUE);

CREATE POLICY "City admins can manage emission factors"
ON emission_factors FOR ALL
USING (get_my_role() = 'city_admin');

CREATE POLICY "Public can read active eco campaigns"
ON eco_campaigns FOR SELECT
USING (is_active = TRUE OR get_my_role() = 'city_admin');

CREATE POLICY "City admins can manage eco campaigns"
ON eco_campaigns FOR ALL
USING (get_my_role() = 'city_admin');

CREATE POLICY "Public can read active rewards catalog"
ON rewards FOR SELECT
USING (is_active = TRUE OR get_my_role() = 'city_admin');

CREATE POLICY "City admins can manage rewards catalog"
ON rewards FOR ALL
USING (get_my_role() = 'city_admin');

-- -----------------------------------------------------------------------------
-- 4. Journeys & Segments Isolation
-- -----------------------------------------------------------------------------
CREATE POLICY "Commuters can read own journeys"
ON journeys FOR SELECT
USING (auth.uid() = user_id OR get_my_role() = 'city_admin');

CREATE POLICY "Commuters can create own journeys"
ON journeys FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Commuters can update own journeys"
ON journeys FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Commuters can read own journey segments"
ON journey_segments FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM journeys j
        WHERE j.id = journey_segments.journey_id
          AND (j.user_id = auth.uid() OR get_my_role() = 'city_admin')
    )
);

-- -----------------------------------------------------------------------------
-- 5. Emergency Contacts, Incidents & Location Updates Isolation
-- -----------------------------------------------------------------------------
CREATE POLICY "Commuters manage own emergency contacts"
ON emergency_contacts FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Commuters and safety operators can access emergency incidents"
ON emergency_incidents FOR SELECT
USING (auth.uid() = user_id OR get_my_role() IN ('city_admin', 'safety_operator'));

CREATE POLICY "Commuters can create own emergency incidents"
ON emergency_incidents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Commuters and safety operators can update emergency incidents"
ON emergency_incidents FOR UPDATE
USING (auth.uid() = user_id OR get_my_role() IN ('city_admin', 'safety_operator'));

CREATE POLICY "Restricted access to emergency location updates"
ON emergency_location_updates FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM emergency_incidents ei
        WHERE ei.id = emergency_location_updates.incident_id
          AND (ei.user_id = auth.uid() OR get_my_role() IN ('city_admin', 'safety_operator'))
    )
);

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

-- -----------------------------------------------------------------------------
-- 6. Carbon Wallets, Transactions & Redemptions (Strict Read-Only for Clients)
-- -----------------------------------------------------------------------------
CREATE POLICY "Commuters can read own carbon wallet"
ON carbon_wallets FOR SELECT
USING (auth.uid() = user_id OR get_my_role() = 'city_admin');

-- Note: No INSERT/UPDATE/DELETE policy on carbon_wallets or carbon_transactions for commuters!
-- Balances are mutated exclusively via backend service-role / SECURITY DEFINER procedures.

CREATE POLICY "Commuters can read own carbon transactions"
ON carbon_transactions FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM carbon_wallets cw
        WHERE cw.id = carbon_transactions.wallet_id
          AND (cw.user_id = auth.uid() OR get_my_role() = 'city_admin')
    )
);

CREATE POLICY "Commuters can read own reward redemptions"
ON reward_redemptions FOR SELECT
USING (auth.uid() = user_id OR get_my_role() = 'city_admin');

-- -----------------------------------------------------------------------------
-- 7. Notifications & Audit Logs
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can read own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can mark own notifications read"
ON notifications FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Only city admins can read audit logs"
ON audit_logs FOR SELECT
USING (get_my_role() = 'city_admin');
