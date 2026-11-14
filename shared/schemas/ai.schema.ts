import { z } from "zod";
import { TRANSPORT_MODES } from "../constants";

export const aiRouteExplanationResponseSchema = z.object({
  recommended_route_id: z.string().min(1),
  summary: z.string().min(1),
  reasoning: z.array(z.string()).min(1),
  warnings: z.array(z.string()),
  tradeoffs: z.array(z.string()),
  confidence: z.number().min(0).max(1)
});

export const aiSafeRouteAdvisoryResponseSchema = z.object({
  route_id: z.string().min(1),
  safety_summary: z.string().min(1),
  safety_score: z.number().min(0).max(100),
  confidence: z.number().min(0).max(1),
  positive_indicators: z.array(z.string()),
  risk_indicators: z.array(z.string()),
  missing_information: z.array(z.string()),
  recommendations: z.array(z.string())
});

export const aiWeatherAdvisoryResponseSchema = z.object({
  overall_risk: z.enum(["low", "moderate", "high", "critical"]),
  summary: z.string().min(1),
  affected_segments: z.array(
    z.object({
      segment_id: z.string(),
      risk_level: z.enum(["low", "moderate", "high", "critical"]),
      reason: z.string()
    })
  ),
  recommended_action: z.string().min(1),
  requires_recalculation: z.boolean()
});

export const aiEcoRecommendationResponseSchema = z.object({
  recommendations: z.array(
    z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      transport_mode: z.enum(TRANSPORT_MODES),
      estimated_co2_savings: z.number().nonnegative(),
      campaign_id: z.string().min(1),
      multiplier: z.number().min(1).max(5),
      estimated_extra_coins: z.number().nonnegative(),
      reason: z.string().min(1)
    })
  ),
  personalized_message: z.string().min(1)
});

export const aiTravelAssistantResponseSchema = z.object({
  message: z.string().min(1),
  intent: z.enum(["route_advice", "safety_inquiry", "weather_inquiry", "carbon_rewards", "general_assistance"]),
  suggested_actions: z.array(
    z.object({
      type: z.enum(["view_route", "enable_saferoute", "view_wallet", "check_weather", "plan_journey"]),
      label: z.string().min(1)
    })
  ),
  warnings: z.array(z.string()),
  requires_user_confirmation: z.boolean()
});

export const aiTravelAssistantRequestSchema = z.object({
  prompt: z.string().min(1).max(1000),
  context: z.record(z.string(), z.unknown()).optional()
});

export type AIRouteExplanationResponse = z.infer<typeof aiRouteExplanationResponseSchema>;
export type AISafeRouteAdvisoryResponse = z.infer<typeof aiSafeRouteAdvisoryResponseSchema>;
export type AIWeatherAdvisoryResponse = z.infer<typeof aiWeatherAdvisoryResponseSchema>;
export type AIEcoRecommendationResponse = z.infer<typeof aiEcoRecommendationResponseSchema>;
export type AITravelAssistantResponse = z.infer<typeof aiTravelAssistantResponseSchema>;
