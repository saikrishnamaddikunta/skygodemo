# OmniTransit AI — Deployment Guide

## 1. Prerequisites
- Node.js `>= 20.x` and npm `>= 10.x`
- Supabase Cloud PostgreSQL project (with PostGIS enabled)
- Optional external API credentials:
  - `GEMINI_API_KEY` (Google AI Studio / Vertex AI for `@google/genai`)
  - `OPENWEATHER_API_KEY` (OpenWeatherMap API)

## 2. Environment Configuration
1. Copy `server/.env.example` to `server/.env` and configure:
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and optional `SUPABASE_DB_URL`
   - `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-2.5-flash`
   - `JWT_SECRET` (strong 32+ character secret)
2. Copy `client/.env.example` to `client/.env` and configure:
   - `VITE_API_BASE_URL`
   - `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

## 3. Database Migration (Supabase Cloud)
Apply `supabase/migrations/001_initial_schema.sql` to Supabase Cloud:
```bash
npm run db:migrate
```

## 4. Production Build & Start
```bash
npm install
npm run build
npm run start
```
