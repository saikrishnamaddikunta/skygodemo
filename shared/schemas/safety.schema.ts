import { z } from "zod";
import { coordinateSchema } from "./journey.schema";

export const safetyEvaluationSchema = z.object({
  origin: coordinateSchema,
  destination: coordinateSchema,
  routeId: z.string().optional(),
  timeOfTravel: z.string().optional(),
  preferWellLit: z.boolean().default(true),
  preferPopulated: z.boolean().default(true),
  avoidHighRiskZones: z.boolean().default(true),
  preferEmergencyInfrastructure: z.boolean().default(true),
  womenNightMode: z.boolean().default(false).optional()
});

export const safetyWeightsSchema = z.object({
  streetLighting: z.number().min(0).max(1),
  populationActivity: z.number().min(0).max(1),
  historicalIncidentRisk: z.number().min(0).max(1),
  emergencyInfrastructure: z.number().min(0).max(1),
  publicTransportAccess: z.number().min(0).max(1),
  roadAccessibility: z.number().min(0).max(1)
});

export const shareJourneySchema = z.object({
  journeyId: z.string().min(1),
  contactIds: z.array(z.string()).min(1, "Select at least one trusted contact"),
  enableLiveLocation: z.boolean().default(true),
  note: z.string().max(300).optional()
});

export type SafetyEvaluationInput = z.infer<typeof safetyEvaluationSchema>;
export type ShareJourneyInput = z.infer<typeof shareJourneySchema>;
