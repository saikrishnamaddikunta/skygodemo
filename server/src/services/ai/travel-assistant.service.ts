import { AITravelAssistantResponse } from "@omnitransit/shared";
import { db } from "../../repositories/database.repository";
import { aiTravelAssistantResponseSchema } from "./ai.schemas";
import { executeStructuredGeminiPrompt } from "./gemini.client";

export const travelAssistantService = {
  async askAssistant(params: {
    userId: string;
    prompt: string;
  }): Promise<{
    data: AITravelAssistantResponse;
    source: "GEMINI_AI" | "DETERMINISTIC_FALLBACK";
  }> {
    const state = db.getState();
    const wallet = state.carbon_wallets.find((w) => w.user_id === params.userId);
    const lower = params.prompt.toLowerCase();

    const fallbackBuilder = (): AITravelAssistantResponse => {
      if (lower.includes("safe") || lower.includes("night") || lower.includes("women") || lower.includes("woman")) {
        return {
          message:
            "Women at Night Mode & SafeRoute strictly filter out poorly lit side streets (<82/100 lighting) and route exclusively via high-lumen Smart LED corridors (MG Road, Indiranagar, Jayanagar, 91-95/100 score), Safe City CCTV stations with Women's Help Desks, and 24x7 Hoysala Police Patrol proximity (<150m). Share your live journey in-app with trusted contacts and use 1-tap 112 SOS anytime.",
          intent: "safety_inquiry",
          suggested_actions: [
            { type: "enable_saferoute", label: "Activate Women at Night Mode" },
            { type: "plan_journey", label: "Plan a Night-Safe Journey" }
          ],
          warnings: [
            "Safety scores reflect available infrastructure indicators and do not guarantee complete safety."
          ],
          requires_user_confirmation: false
        };
      }

      if (lower.includes("weather") || lower.includes("rain") || lower.includes("flood") || lower.includes("traffic") || lower.includes("congestion") || lower.includes("delay")) {
        const sim = state.weather_simulation;
        return {
          message: sim.disruption_active
            ? `Active Transit & Traffic Bottleneck Alert: Surface arterial congestion detected on direct Route 201R. AI Smart Mobility has automatically synchronized your transfer via Namma Metro Purple Line + BMTC Route 12 Electric Feeder to save 14 minutes.`
            : `All multi-modal corridors (Namma Metro, BMTC Electric Fleet, and Yulu Micro-Mobility) are operating on schedule with optimal headways and balanced fleet utilization.`,
          intent: "weather_inquiry",
          suggested_actions: [
            { type: "check_weather", label: "Inspect Corridor & Fleet Status" },
            { type: "view_route", label: "Compare Synchronized Routes" }
          ],
          warnings: sim.disruption_active
            ? ["Peak surface traffic bottleneck bypassed via grade-separated Metro + Feeder."]
            : [],
          requires_user_confirmation: false
        };
      }

      if (lower.includes("coin") || lower.includes("carbon") || lower.includes("reward")) {
        return {
          message: `Your Carbon Wallet currently holds ${
            wallet?.balance ?? 0
          } Carbon Coins (${wallet?.lifetime_co2_saved ?? 0} kg CO2e saved). You can earn 1.5x coins on BMTC Route 12 off-peak buses or 1.75x coins by combining Namma Metro with Yulu E-Bikes!`,
          intent: "carbon_rewards",
          suggested_actions: [
            { type: "view_wallet", label: "Open Carbon Wallet" },
            { type: "plan_journey", label: "Plan an Eco-Friendly Journey" }
          ],
          warnings: [],
          requires_user_confirmation: false
        };
      }

      return {
        message:
          "I can help you compare multi-modal routes (Namma Metro, BMTC Bus, Yulu E-Bike, and Walking), evaluate SafeRoute lighting & CCTV indicators, check flood/waterlogging alerts, and maximize your Carbon Coins.",
        intent: "route_advice",
        suggested_actions: [
          { type: "plan_journey", label: "Plan Multi-Modal Journey" },
          { type: "view_route", label: "Compare Route Alternatives" },
          { type: "enable_saferoute", label: "Inspect SafeRoute Scores" }
        ],
        warnings: [],
        requires_user_confirmation: false
      };
    };

    const userPrompt = `User question: "${params.prompt}"
Application context:
- Weather disruption active: ${state.weather_simulation.disruption_active} (${state.weather_simulation.condition_text})
- User Carbon Coin balance: ${wallet?.balance ?? 0}
- Active campaigns: ${state.eco_campaigns.map((c) => `${c.campaign_name} (${c.multiplier}x)`).join(", ")}
Return structured JSON matching the Travel Assistant schema.`;

    return executeStructuredGeminiPrompt<AITravelAssistantResponse>({
      taskName: "travel_assistant",
      userPrompt,
      schema: aiTravelAssistantResponseSchema,
      fallbackGenerator: fallbackBuilder
    });
  }
};
