# OmniTransit AI — PostgreSQL & PostGIS Database Schema

## 1. Migration Source of Truth
- `supabase/migrations/001_initial_schema.sql`: Complete unified migration containing PostGIS + pgcrypto extensions, all 23 tables, spatial GIST indexes, triggers, stored procedures, Row Level Security (RLS) policies, and Bengaluru seed data.
- `supabase/migrations/0001_extensions_and_core_tables.sql` & `0002_row_level_security.sql`: Modular migration files.

## 2. Core Tables (23 Tables)
1. `profiles`
2. `user_preferences`
3. `transit_stops` (`GEOGRAPHY(POINT, 4326)` + GIST index)
4. `transit_routes` (`GEOGRAPHY(LINESTRING, 4326)` + GIST index)
5. `transit_trips`
6. `fleet_vehicles` (`GEOGRAPHY(POINT, 4326)` + GIST index)
7. `journeys`
8. `journey_segments`
9. `safety_indicators` (`GEOGRAPHY(POINT, 4326)` + GIST index)
10. `safety_zones` (`GEOGRAPHY(POLYGON, 4326)` + GIST index)
11. `weather_alerts` (`GEOGRAPHY(POLYGON, 4326)` + GIST index)
12. `flood_zones` (`GEOGRAPHY(POLYGON, 4326)` + GIST index)
13. `emergency_contacts`
14. `emergency_incidents`
15. `emergency_location_updates`
16. `emission_factors`
17. `carbon_wallets`
18. `carbon_transactions` (Immutable ledger enforced by `trg_immutable_carbon_transactions` and `UNIQUE(idempotency_key)`)
19. `eco_campaigns`
20. `rewards`
21. `reward_redemptions`
22. `notifications`
23. `audit_logs`

## 3. Applying Schema to Supabase Cloud
Run the Node.js migration script using your Supabase credentials:
```bash
npm run db:migrate
```
Or execute `supabase/migrations/001_initial_schema.sql` directly in the Supabase Cloud SQL Editor.
