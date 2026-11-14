-- =============================================================================
-- OMNITRANSIT AI — PRODUCTION & DEVELOPMENT SEED DATA (BENGALURU URBAN NETWORK)
-- =============================================================================

-- 1. Emission Factors (Authoritative Regional Defaults - India Urban Mobility)
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
ON CONFLICT DO NOTHING;

-- 2. Transit Stops (Bengaluru Key Mobility Hubs)
INSERT INTO transit_stops (external_id, name, stop_type, location, city, accessibility_info, is_active, source)
VALUES
    ('STOP-MAJESTIC', 'Majestic Kempegowda Interchange', 'metro_station', ST_GeogFromText('SRID=4326;POINT(77.5713 12.9767)'), 'Bengaluru', '{"wheelchair": true, "elevator": true, "tactile_paving": true}', TRUE, 'BMRCL/BMTC'),
    ('STOP-MG-ROAD', 'MG Road Metro & Mobility Hub', 'metro_station', ST_GeogFromText('SRID=4326;POINT(77.6068 12.9756)'), 'Bengaluru', '{"wheelchair": true, "elevator": true, "tactile_paving": true}', TRUE, 'BMRCL'),
    ('STOP-INDIRANAGAR', 'Indiranagar Metro Station', 'metro_station', ST_GeogFromText('SRID=4326;POINT(77.6387 12.9784)'), 'Bengaluru', '{"wheelchair": true, "elevator": true}', TRUE, 'BMRCL'),
    ('STOP-KORAMANGALA', 'Koramangala Sony World Bus Terminal', 'bus_stop', ST_GeogFromText('SRID=4326;POINT(77.6245 12.9352)'), 'Bengaluru', '{"wheelchair": true, "shelter": true}', TRUE, 'BMTC'),
    ('STOP-SILK-BOARD', 'Silk Board Multi-Modal Junction', 'bus_stop', ST_GeogFromText('SRID=4326;POINT(77.6227 12.9172)'), 'Bengaluru', '{"wheelchair": false, "shelter": true}', TRUE, 'BMTC'),
    ('STOP-WHITEFIELD', 'Whitefield (Kadugodi) Terminal', 'metro_station', ST_GeogFromText('SRID=4326;POINT(77.7500 12.9950)'), 'Bengaluru', '{"wheelchair": true, "elevator": true}', TRUE, 'BMRCL'),
    ('STOP-JAYANAGAR', 'Jayanagar 4th Block TTMC', 'bus_stop', ST_GeogFromText('SRID=4326;POINT(77.5839 12.9299)'), 'Bengaluru', '{"wheelchair": true, "elevator": true}', TRUE, 'BMTC')
ON CONFLICT (external_id) DO NOTHING;

-- 3. Safety Indicators
INSERT INTO safety_indicators (location, indicator_type, score, description, confidence, source, verification_status, observed_at)
VALUES
    (ST_GeogFromText('SRID=4326;POINT(77.6068 12.9756)'), 'street_lighting', 92, 'High-lumen smart LED street lighting along MG Road and Brigade Road', 94, 'BBMP Smart City Sensor', 'verified', NOW()),
    (ST_GeogFromText('SRID=4326;POINT(77.6387 12.9784)'), 'cctv_infrastructure', 88, 'BMRCL & Bengaluru Safe City CCTV active coverage', 91, 'Safe City Command Center', 'verified', NOW()),
    (ST_GeogFromText('SRID=4326;POINT(77.6227 12.9172)'), 'road_accessibility', 64, 'Flyover construction narrowing pedestrian walkway at Silk Board', 85, 'Traffic Police Advisory', 'verified', NOW());

-- 4. Flood Zones
INSERT INTO flood_zones (zone_name, boundary, risk_level, risk_score, source, is_active)
VALUES
    (
        'Bellandur - Outer Ring Road Low-Lying Basin',
        ST_GeogFromText('SRID=4326;POLYGON((77.660 12.925, 77.685 12.925, 77.685 12.942, 77.660 12.942, 77.660 12.925))'),
        'HIGH',
        82.5,
        'BBMP / KSNDMC Flood Monitoring Cell',
        TRUE
    ),
    (
        'Koramangala 4th Block Storm Drain Corridor',
        ST_GeogFromText('SRID=4326;POLYGON((77.620 12.930, 77.632 12.930, 77.632 12.939, 77.620 12.939, 77.620 12.930))'),
        'MODERATE',
        58.0,
        'KSNDMC Historical Waterlogging Layer',
        TRUE
    );

-- 5. Eco Campaigns
INSERT INTO eco_campaigns (campaign_name, description, multiplier, eligible_modes, start_time, end_time, daily_reward_limit, is_active)
VALUES
    (
        'BMTC Off-Peak Green Corridor Boost',
        'Earn 1.5x Carbon Coins on public bus journeys during off-peak hours (11:00–16:00 IST) on Route 12 & Route 500D.',
        1.500,
        ARRAY['bus'],
        NOW() - INTERVAL '7 days',
        NOW() + INTERVAL '60 days',
        500.00,
        TRUE
    ),
    (
        'Namma Metro + E-Bike Last-Mile Challenge',
        'Combine Metro with zero-emission E-Bike or Walking for 1.75x Carbon Coin rewards.',
        1.750,
        ARRAY['metro', 'ebike', 'walking'],
        NOW() - INTERVAL '7 days',
        NOW() + INTERVAL '60 days',
        500.00,
        TRUE
    );

-- 6. Rewards Catalog
INSERT INTO rewards (reward_name, description, coin_cost, reward_type, stock, is_active)
VALUES
    ('Namma Metro ₹50 Smart Card Top-Up Voucher', 'Redeemable voucher code for ₹50 rebate on BMRCL Namma Metro recharge (Demo Voucher)', 120.00, 'transit_discount', 250, TRUE),
    ('BMTC Vajra AC Day Pass 25% Discount', 'Digital coupon for 25% off a BMTC daily transit pass (Demo Coupon)', 90.00, 'transit_discount', 500, TRUE),
    ('Yulu E-Bike 30-Minute Free Unlock', 'Free 30-minute last-mile micro-mobility ride credit (Demo Voucher)', 60.00, 'mobility_voucher', 400, TRUE),
    ('Green Commuter Champion Badge', 'Verified profile sustainability badge for saving 25+ kg of CO2e', 50.00, 'digital_badge', NULL, TRUE),
    ('Zero-Emission Monsoon Pioneer Achievement', 'Special seasonal eco-commuter achievement trophy', 150.00, 'achievement', NULL, TRUE);
