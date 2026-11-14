import { z } from "zod";
import { coordinateSchema } from "./journey.schema";
import { ROUTING_PREFERENCES, TRANSPORT_MODES } from "../constants";

export const routingAlternativesRequestSchema = z.object({
  origin: coordinateSchema,
  destination: coordinateSchema,
  originLabel: z.string().optional(),
  destinationLabel: z.string().optional(),
  routingPreference: z.enum(ROUTING_PREFERENCES).default("balanced"),
  departureTime: z.string().optional(),
  maximumBudget: z.number().nonnegative().optional(),
  maxWalkingDistance: z.number().positive().default(1500),
  saferouteEnabled: z.boolean().default(false),
  womenNightMode: z.boolean().default(false).optional(),
  weatherAvoidance: z.boolean().default(true),
  preferredModes: z.array(z.enum(TRANSPORT_MODES)).default(["bus", "metro", "train", "walking", "cycling", "ebike"])
});

export const recalculateRouteSchema = z.object({
  journeyId: z.string().optional(),
  currentLocation: coordinateSchema,
  destination: coordinateSchema,
  routingPreference: z.enum(ROUTING_PREFERENCES).default("balanced"),
  saferouteEnabled: z.boolean().default(true),
  womenNightMode: z.boolean().default(false).optional(),
  disruptedSegmentIds: z.array(z.string()).default([]),
  reason: z.string().max(300).optional()
});

export const nearbyTransitQuerySchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusMeters: z.coerce.number().positive().max(10000).default(2000)
});

export type RoutingAlternativesRequest = z.infer<typeof routingAlternativesRequestSchema>;
export type RecalculateRouteRequest = z.infer<typeof recalculateRouteSchema>;
