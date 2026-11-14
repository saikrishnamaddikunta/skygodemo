# OmniTransit AI — REST API Documentation (`/api/v1`)

All endpoints return a consistent JSON envelope:
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

## 1. Authentication (`/api/v1/auth`)
- `POST /auth/register`: Provisions commuter profile, preferences, and Carbon Wallet.
- `POST /auth/login`: Authenticates user and returns signed JWT + profile + wallet.
- `POST /auth/forgot-password`: Initiates password recovery flow.
- `GET /auth/me`: Returns current authenticated user profile, preferences, wallet, and notifications.
- `POST /auth/profile` & `PATCH /auth/profile`: Updates permitted profile fields.
- `PATCH /auth/preferences`: Updates user mobility, SafeRoute, and notification preferences.

## 2. Journey Planning (`/api/v1/journeys`)
- `POST /journeys/plan`: Creates a planned multi-modal journey and persists segment records.
- `GET /journeys`: Lists the authenticated commuter's journeys.
- `GET /journeys/:id` & `GET /journeys/:id/segments`: Retrieves journey details and ordered segments.
- `POST /journeys/:id/start`: Transitions journey to `active` and emits Socket.IO event.
- `POST /journeys/:id/complete`: Marks journey `completed` and atomically credits Carbon Coins with idempotency protection.
- `POST /journeys/:id/cancel`: Cancels an uncompleted journey.

## 3. Multi-Modal Routing (`/api/v1/routing`)
- `POST /routing/alternatives`: Generates 5 profile-optimized multi-modal routes (`balanced`, `fastest`, `cheapest`, `safest`, `eco`).
- `POST /routing/recalculate`: Recalculates routes around disrupted or flooded segments.
- `GET /routing/nearby-transit`: Finds nearby stops and connecting routes within a radius.
- `GET /routing/route/:id`: Retrieves a cached route alternative by ID.

## 4. SafeRoute (`/api/v1/safety`)
- `POST /safety/evaluate`: Evaluates weighted corridor safety score, confidence, and missing data disclosures.
- `GET /safety/nearby` & `GET /safety/zones`: Returns verified safety indicators and CCTV/lighting hub scores.
- `POST /safety/share-journey` & `DELETE /safety/share-journey/:id`: Starts/stops live journey sharing with verified emergency contacts.

## 5. Emergency SOS (`/api/v1/emergency`)
- `POST /emergency/sos`: Creates an active emergency incident, notifies verified contacts, and includes visible India `112` fallback notice.
- `GET /emergency/:id`: Retrieves incident and location history (restricted to owner, `city_admin`, and `safety_operator`).
- `POST /emergency/:id/location`: Records a live geolocation update.
- `POST /emergency/:id/cancel` & `POST /emergency/:id/resolve`: Cancels or resolves an incident.
- `GET / POST / PATCH / DELETE /emergency/contacts`: CRUD for verified emergency contacts.

## 6. Weather & Climate (`/api/v1/weather`)
- `GET /weather/current` & `GET /weather/forecast`: Returns current weather, rainfall intensity, and hazard level.
- `GET /weather/alerts`: Returns verified weather alerts and active flood zones.
- `GET /weather/route-impact`: Evaluates polygon intersections between a route and flood zones.
- `POST /weather/refresh`: Refreshes weather data or toggles the development storm disruption fixture.

## 7. Carbon Coins Economy (`/api/v1/carbon`)
- `GET /carbon/wallet` & `GET /carbon/transactions`: Returns wallet balances and immutable ledger entries.
- `GET /carbon/impact`: Returns total CO2e saved, modal distance breakdown, and emission factors.
- `POST /carbon/calculate`: Computes server-side carbon savings from trusted journey records.
- `GET /carbon/campaigns` & `GET /carbon/rewards`: Lists active multiplier campaigns and redeemable rewards.
- `POST /carbon/redeem`: Atomically redeems Carbon Coins for a voucher code.

## 8. Gemini AI Advisory (`/api/v1/ai`)
- `POST /ai/route-explanation`: Structured JSON explanation of route trade-offs, safety, and weather advisories.
- `POST /ai/eco-recommendations`: Personalized sustainable transit suggestions verified against DB campaign multipliers.
- `POST /ai/travel-assistant`: Conversational urban mobility assistant validated with Zod.

## 9. City Operations Admin (`/api/v1/admin`)
Protected by server-side RBAC (`city_admin`, `operations_manager`, `safety_operator`):
- `GET /admin/overview`, `GET /admin/fleet`, `GET /admin/routes`, `PATCH /admin/routes/:id`
- `POST / PATCH / DELETE /admin/flood-zones`
- `GET /admin/safety/heatmap`, `PATCH /admin/safety/weights`
- `GET /admin/incidents`, `GET /admin/carbon/analytics`
- `GET / POST / PATCH / DELETE /admin/campaigns`
- `GET /admin/users`, `PATCH /admin/users/:id/role`, `GET /admin/audit-logs`
