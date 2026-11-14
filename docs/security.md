# OmniTransit AI — Security & Privacy Architecture

## 1. Authentication & Authorization (RBAC)
- Four distinct roles: `commuter`, `city_admin`, `operations_manager`, and `safety_operator`.
- Public registration strictly provisions the `commuter` role; self-escalation of roles is blocked both by backend middleware and by the PostgreSQL trigger `trg_prevent_role_self_escalation`.
- Every `/api/v1/admin/*` endpoint enforces explicit server-side role verification via `requireRoles(...)`.

## 2. Row Level Security (RLS)
- RLS is enabled across all 23 tables in `supabase/migrations/001_initial_schema.sql`.
- Commuters can only read/write their own journeys, segments, preferences, and emergency contacts (`auth.uid() = user_id`).
- Emergency incidents and live location updates are strictly isolated to the incident owner, `safety_operator`, and `city_admin`.
- `carbon_wallets` and `carbon_transactions` have **no client-side write policies**; all wallet credits and redemptions execute server-side with idempotency keys.

## 3. Emergency SOS Safety Safeguards
- Requires explicit user confirmation (or a cancellable 5-second countdown) before triggering.
- Clearly displays India's official emergency number (`112`) and never claims direct police dispatch unless a verified integration confirms delivery.

## 4. Gemini AI Security Guardrails
- `@google/genai` executes exclusively on the backend (`server/src/services/ai/gemini.client.ts`).
- AI output is strictly validated at runtime with Zod schemas (`shared/schemas/ai.schema.ts`).
- AI cannot modify wallet balances, invent transit schedules, or independently declare flooded roads safe.
