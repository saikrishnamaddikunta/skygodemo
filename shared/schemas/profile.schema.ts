import { z } from "zod";
import { TRANSPORT_MODES, USER_ROLES } from "../constants";

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().min(10).max(20).optional(),
  preferred_language: z.string().min(2).max(10).optional(),
  preferred_currency: z.string().length(3).optional(),
  timezone: z.string().min(3).max(50).optional()
}).strict();

export const userPreferencesSchema = z.object({
  preferred_modes: z.array(z.enum(TRANSPORT_MODES)).min(1).optional(),
  max_walking_distance: z.number().int().positive().max(10000).optional(),
  max_budget: z.number().nonnegative().max(10000).nullable().optional(),
  saferoute_enabled: z.boolean().optional(),
  weather_alerts_enabled: z.boolean().optional(),
  eco_notifications_enabled: z.boolean().optional(),
  accessibility_preferences: z.record(z.string(), z.boolean()).optional()
}).strict();

export const roleSchema = z.enum(USER_ROLES);

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type UserPreferencesInput = z.infer<typeof userPreferencesSchema>;
