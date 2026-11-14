# OmniTransit AI
**AI-Powered Multi-Modal Smart Mobility, Safety, Climate Intelligence & Eco-Gamification Platform**

OmniTransit AI is a full-stack intelligent urban transportation platform designed for Indian metropolitan networks (defaulting to Bengaluru — BMTC Bus, Namma Metro, Yulu E-Bike, and Pedestrian corridors, `INR ₹`, `Asia/Kolkata` IST).

---

## Key Capabilities

1. **Dynamic Cost & Multi-Modal Routing (`Dijkstra` & `A*` Graph Engine)**
   - Combines Walking, Public Bus, Metro, Local Train, Cycling, and E-Bikes into unified journeys.
   - Five optimization strategies: **Cheapest**, **Fastest**, **Safest (SafeRoute)**, **Eco-Friendly**, and **Balanced AI Route**.
2. **SafeRoute / Women's Safety AI & Emergency SOS**
   - Evaluates configurable safety weights (25% Street Lighting, 20% Population Activity, 20% Historical Incident Risk, 15% Emergency Infrastructure, 10% Public Transport Access, 10% Road Accessibility).
   - Displays confidence & data freshness, supports live journey sharing with verified contacts, and provides a 1-tap **Emergency SOS** workflow with prominent fallback to India's official emergency number **112**.
3. **Climate & Weather Adaptive Routing**
   - Classifies hazards (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`), checks route segments against PostGIS/polygon flood zones, and automatically recalculates routes around waterlogged storm-drain corridors.
4. **Carbon Coins Eco-Gamification Engine**
   - Calculates `CO2 Saved = Baseline Emissions - Actual Journey Emissions` and `Carbon Coins = CO2 Saved × Base Rate × Dynamic Route Multiplier`.
   - Protects balances with an immutable transaction ledger, idempotency keys, daily caps, and server-side validation.
5. **Gemini AI Integration (`@google/genai`)**
   - Server-side integration for Route Explanations, SafeRoute Summaries, Weather Advisories, Eco-Recommendations, and a Conversational Travel Assistant — all validated with Zod schemas and backed by deterministic fallbacks.
6. **Dual Interfaces: Commuter App (`/app/*`) & City Operations Admin Portal (`/admin/*`)**
   - Enforces strict Role-Based Access Control (`commuter`, `city_admin`, `operations_manager`, `safety_operator`).

---

## Quick Start (Local Development)

```bash
# 1. Install dependencies across all workspaces (shared, server, client)
npm install

# 2. Build shared Zod schemas & TypeScript types
npm run build:shared

# 3. Apply database schema to Supabase Cloud (when SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY are set)
npm run db:migrate

# 4. Run automated test suite (Routing, Auth, RBAC, SOS, Weather Rerouting, Carbon Ledger, Gemini Validation)
npm test

# 5. Start backend (port 5000) and frontend (port 5173)
npm run dev:server
npm run dev:client
```

## Pre-Seeded Demo Accounts (Development Mode)

| Role | Email | Password | Portal |
| :--- | :--- | :--- | :--- |
| **Commuter** | `commuter@omnitransit.in` | `Commuter@123` | `/app` |
| **City Admin** | `admin@omnitransit.in` | `Admin@123` | `/admin` |
| **Operations Manager** | `ops@omnitransit.in` | `Ops@12345` | `/admin/fleet` |
| **Safety Operator** | `safety@omnitransit.in` | `Safety@123` | `/admin/incidents` |
