# OmniTransit AI — System Architecture

## 1. Overview
**OmniTransit AI** is an AI-powered multi-modal smart urban mobility, safety, climate intelligence, and Carbon Coins eco-gamification platform designed for Indian urban transportation networks (`INR ₹`, metric units, `Asia/Kolkata` timezone).

## 2. Monorepo Structure
- `shared/`: Centralized TypeScript types, domain constants, and Zod validation schemas shared between `server` and `client`.
- `server/`: Node.js + Express + TypeScript REST API (`/api/v1`), Socket.IO real-time server, Dijkstra & A* multi-modal routing algorithms, SafeRoute scoring engine, Weather/Flood hazard evaluator, Carbon Coins ledger service, `@google/genai` Gemini AI advisory service, and Supabase Cloud migration runner.
- `client/`: React + Vite + TypeScript + Tailwind CSS + React-Leaflet + Recharts + TanStack Query + Zustand frontend with 26 routes across Public, Commuter (`/app/*`), and City Operations Admin (`/admin/*`) portals.
- `supabase/`: Production PostgreSQL + PostGIS migrations (`001_initial_schema.sql`, `0001_extensions_and_core_tables.sql`, `0002_row_level_security.sql`) and seed data (`seed.sql`).

## 3. Multi-Modal Routing Engine
The routing layer models the urban transit network as a directed weighted graph $G = (V, E)$:
- **Nodes ($V$)**: Metro stations, BMTC bus terminals, mobility hubs, and dynamically synthesized origin/destination coordinates.
- **Edges ($E$)**: Walking paths, e-bike lanes, public bus routes, and metro links carrying distance, duration, wait time, cost, CO2e factor, street lighting score, safety score, and flood/weather exposure.
- **Algorithms**:
  - **Dijkstra's Algorithm** (`server/src/algorithms/dijkstra.ts`) for baseline multi-criteria shortest-path optimization across `cheapest`, `fastest`, `safest`, `eco`, and `balanced` profiles.
  - **A* Search** (`server/src/algorithms/astar.ts`) using Haversine geospatial heuristics for fast transit path discovery.
  - **Hard Constraints**: Segments intersecting `CRITICAL` flood zones or active storm waterlogging restrictions receive $\infty$ edge weight and are automatically bypassed.

## 4. Adapter Pattern & Development Fixtures
Every external integration (`Supabase`, `Gemini AI`, `OpenWeatherMap`, `SMS/Email Notifications`) uses an adapter pattern. When external API keys are not configured in `.env`, the backend operates seamlessly using clearly labeled `[DEV_FIXTURE]` adapters and never fabricates live schedule or emergency dispatch claims.
