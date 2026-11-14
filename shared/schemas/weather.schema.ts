import { z } from "zod";
import { HAZARD_LEVELS } from "../constants";

export const weatherQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90).default(12.9716),
  longitude: z.coerce.number().min(-180).max(180).default(77.5946),
  city: z.string().default("Bengaluru")
});

export const weatherAdvisorySchema = z.object({
  alert_type: z.enum(["rainfall", "flooding", "waterlogging", "cyclone", "storm", "high_winds", "severe_weather", "road_closure"]),
  severity: z.enum(HAZARD_LEVELS),
  title: z.string().min(3).max(200),
  description: z.string().max(1000).optional(),
  start_time: z.string(),
  end_time: z.string(),
  source: z.string().min(2).max(100),
  verification_status: z.enum(["verified", "unverified"]).default("verified")
});

export const floodZoneCreateSchema = z.object({
  zone_name: z.string().min(2).max(120),
  risk_level: z.enum(HAZARD_LEVELS),
  risk_score: z.number().min(0).max(100),
  source: z.string().default("BBMP / IMD Flood Monitoring"),
  is_active: z.boolean().default(true),
  coordinates: z.array(
    z.object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180)
    })
  ).min(3, "Polygon boundary requires at least 3 coordinates")
});

export type WeatherQueryInput = z.infer<typeof weatherQuerySchema>;
export type FloodZoneCreateInput = z.infer<typeof floodZoneCreateSchema>;
