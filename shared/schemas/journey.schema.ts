import { z } from "zod";
import { ROUTING_PREFERENCES, TRANSPORT_MODES } from "../constants";

export const coordinateSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const journeySchema = z.object({
  origin: coordinateSchema,
  destination: coordinateSchema,
  originLabel: z.string().min(1).max(200).optional(),
  destinationLabel: z.string().min(1).max(200).optional(),
  routingPreference: z.enum(ROUTING_PREFERENCES),
  departureTime: z.string().datetime().optional(),
  maximumBudget: z.number().nonnegative().optional(),
  maxWalkingDistance: z.number().positive().optional(),
  saferouteEnabled: z.boolean().default(false),
  womenNightMode: z.boolean().default(false).optional(),
  weatherAvoidance: z.boolean().default(true).optional(),
  accessibilityRequirements: z.record(z.string(), z.boolean()).optional(),
  preferredModes: z.array(z.enum(TRANSPORT_MODES)).min(1).default(["bus", "metro", "walking", "ebike"]),
  selectedRouteId: z.string().optional()
});

export const journeyIdParamSchema = z.object({
  id: z.string().min(1)
});

export type Coordinate = z.infer<typeof coordinateSchema>;
export type JourneyPlanInput = z.infer<typeof journeySchema>;
