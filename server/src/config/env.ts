import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { z } from "zod";

const envPath = path.resolve(__dirname, "../../.env");
const envExamplePath = path.resolve(__dirname, "../../.env.example");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else if (fs.existsSync(envExamplePath)) {
  dotenv.config({ path: envExamplePath });
} else {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5050),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  SUPABASE_URL: z.string().optional().default(""),
  SUPABASE_ANON_KEY: z.string().optional().default(""),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash"),
  OPENWEATHER_API_KEY: z.string().optional().default(""),
  OPENWEATHER_BASE_URL: z.string().default("https://api.openweathermap.org/data/2.5"),
  MAPS_PROVIDER: z.string().default("osm"),
  MAPS_API_KEY: z.string().optional().default(""),
  JWT_SECRET: z.string().default("dev-omnitransit-jwt-secret-change-in-production-min-32-chars"),
  DEFAULT_CURRENCY: z.string().default("INR"),
  DEFAULT_TIMEZONE: z.string().default("Asia/Kolkata"),
  BASE_CARBON_REWARD_RATE: z.coerce.number().positive().default(10),
  MAX_DAILY_CARBON_REWARDS: z.coerce.number().positive().default(500),
  LOCATION_UPDATE_INTERVAL_SECONDS: z.coerce.number().positive().default(15),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info")
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
}

export const env = parsed.success ? parsed.data : envSchema.parse({});

export const integrationStatus = {
  supabaseConfigured: Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY),
  geminiConfigured: Boolean(env.GEMINI_API_KEY),
  openWeatherConfigured: Boolean(env.OPENWEATHER_API_KEY),
  mapsConfigured: Boolean(env.MAPS_PROVIDER && env.MAPS_API_KEY)
};
