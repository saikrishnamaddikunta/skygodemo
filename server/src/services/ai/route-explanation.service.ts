import {
  AIRouteExplanationResponse,
  AISafeRouteAdvisoryResponse,
  AIWeatherAdvisoryResponse,
  RouteAlternative
} from "@omnitransit/shared";
import { db } from "../../repositories/database.repository";
import {
  aiRouteExplanationResponseSchema,
  aiSafeRouteAdvisoryResponseSchema,
  aiWeatherAdvisoryResponseSchema
} from "./ai.schemas";
import { executeStructuredGeminiPrompt } from "./gemini.client";

export const routeExplanationService = {
  async explainRoutes(params: {
    alternatives: RouteAlternative[];
    selectedPreference: string;
    saferouteEnabled?: boolean;
  }): Promise<{
    explanation: AIRouteExplanationResponse;
    safeRouteAdvisory: AISafeRouteAdvisoryResponse;
    weatherAdvisory: AIWeatherAdvisoryResponse;
    source: "GEMINI_AI" | "DETERMINISTIC_FALLBACK";
  }> {
    const primary = params.alternatives[0];
    const state = db.getState();

    const prompt = `Analyze the supplied journey alternatives.
Identify the strongest route based on the selected user preference (${params.selectedPreference}).
Supplied routes JSON:
${JSON.stringify(
  params.alternatives.map((a) => ({
    id: a.id,
    profile: a.profile,
    duration: a.totalDurationMinutes,
    costInr: a.totalCostInr,
    co2SavedKg: a.co2SavedKg,
    safetyScore: a.safetyScore,
    weatherRisk: a.weatherRisk,
    transfers: a.transferCount
  }))
)}
Return structured JSON matching:
{
  "recommended_route_id": "string",
  "summary": "string",
  "reasoning": ["string"],
  "warnings": ["string"],
  "tradeoffs": ["string"],
  "confidence": 0.91
}`;

    const routeResult = await executeStructuredGeminiPrompt<AIRouteExplanationResponse>({
      taskName: "route_explanation",
      userPrompt: prompt,
      schema: aiRouteExplanationResponseSchema,
      fallbackGenerator: () => ({
        recommended_route_id: primary.id,
        summary: primary.explanation.summary,
        reasoning: primary.explanation.reasoning,
        warnings:
          primary.warnings.length > 0
            ? primary.warnings
            : state.weather_simulation.disruption_active
            ? ["Active arterial congestion & surface delay alert; synchronized Metro + Electric Feeder selected for optimal travel time."]
            : [],
        tradeoffs: primary.explanation.tradeoffs,
        confidence: 0.91
      })
    });

    // Ensure recommended_route_id is always one of the actual supplied route IDs
    const validIds = new Set(params.alternatives.map((a) => a.id));
    if (!validIds.has(routeResult.data.recommended_route_id)) {
      routeResult.data.recommended_route_id = primary.id;
    }

    const safeRouteAdvisory = aiSafeRouteAdvisoryResponseSchema.parse({
      route_id: primary.id,
      safety_summary:
        primary.safetyScore >= 85
          ? "Available indicators suggest favorable lighting, CCTV coverage, and active transit hub presence."
          : "Moderate corridor safety indicators; stay on primary lit avenues and consider live journey sharing.",
      safety_score: primary.safetyScore,
      confidence: primary.safetyConfidence,
      positive_indicators: [
        "Verified street lighting along primary metro/bus hubs",
        "BMRCL & Safe City CCTV coverage at transfer nodes",
        "Proximity to 24x7 patrol and emergency response points"
      ],
      risk_indicators:
        primary.safetyScore < 82
          ? ["Reduced pedestrian visibility near flyover underpasses after 22:00 IST"]
          : [],
      missing_information: [
        "Minor connecting footpath lighting between feeder stops is estimated from nearest hub telemetry"
      ],
      recommendations: [
        "Share your live journey with a verified trusted contact",
        "Use the one-tap SOS button or dial 112 in case of immediate emergency"
      ]
    });

    const weatherRiskLower = primary.weatherRisk.toLowerCase() as
      | "low"
      | "moderate"
      | "high"
      | "critical";

    const weatherAdvisory = aiWeatherAdvisoryResponseSchema.parse({
      overall_risk: state.weather_simulation.disruption_active ? "high" : weatherRiskLower,
      summary: state.weather_simulation.disruption_active
        ? "Heavy rainfall & waterlogging watch active; surface drain corridors avoided in favor of elevated Metro + Route 12."
        : "Normal urban travel weather conditions across the selected multi-modal corridor.",
      affected_segments: primary.segments
        .filter((s) => s.weatherRisk !== "LOW")
        .map((s) => ({
          segment_id: s.id,
          risk_level: s.weatherRisk.toLowerCase() as "low" | "moderate" | "high" | "critical",
          reason: s.restrictionReason || "Surface weather exposure"
        })),
      recommended_action: state.weather_simulation.disruption_active
        ? "Follow the recalculated Metro + Feeder route to bypass low-lying waterlogging zones"
        : "Proceed with planned multi-modal journey",
      requires_recalculation: state.weather_simulation.disruption_active
    });

    return {
      explanation: routeResult.data,
      safeRouteAdvisory,
      weatherAdvisory,
      source: routeResult.source
    };
  }
};
