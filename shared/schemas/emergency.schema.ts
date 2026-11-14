import { z } from "zod";

export const sosSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  journeyId: z.string().optional(),
  message: z.string().max(500).optional(),
  countdownUsedSeconds: z.number().int().min(0).max(60).optional()
});

export const emergencyLocationUpdateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative().default(15)
});

export const emergencyContactSchema = z.object({
  contact_name: z.string().min(2).max(100),
  phone: z.string().min(10).max(20),
  email: z.string().email().optional().or(z.literal("")),
  relationship: z.string().min(2).max(50),
  is_verified: z.boolean().default(false),
  notification_preferences: z.array(z.enum(["in_app", "live_share"])).default(["in_app", "live_share"])
});

export const emergencyContactUpdateSchema = emergencyContactSchema.partial();

export type SOSInput = z.infer<typeof sosSchema>;
export type EmergencyContactInput = z.infer<typeof emergencyContactSchema>;
