import { AIEcoRecommendationResponse } from "@omnitransit/shared";
import { env } from "../../config/env";
import { db } from "../../repositories/database.repository";
import { aiEcoRecommendationResponseSchema } from "./ai.schemas";
import { executeStructuredGeminiPrompt } from "./gemini.client";

export const ecoRecommendationService = {
  async generateEcoRecommendations(userId: string): Promise<{
    data: AIEcoRecommendationResponse;
    source: "GEMINI_AI" | "DETERMINISTIC_FALLBACK";
  }> {
    const state = db.getState();
    const activeCampaigns = state.eco_campaigns.filter((c) => c.is_active);
    const wallet = state.carbon_wallets.find((w) => w.user_id === userId);
    const userJourneys = state.journeys.filter((j) => j.user_id === userId);

    const fallbackBuilder = (): AIEcoRecommendationResponse => {
      const camp1 = activeCampaigns[0] || {
        id: "camp-bmtc-offpeak",
        campaign_name: "BMTC Route 12 Off-Peak Green Boost",
        multiplier: 1.5
      };
      const camp2 = activeCampaigns[1] || {
        id: "camp-metro-ebike",
        campaign_name: "Namma Metro + Micro-Mobility Zero-Carbon Combo",
        multiplier: 1.75
      };

      const co2Save1 = 1.8;
      const coins1 = Number((co2Save1 * env.BASE_CARBON_REWARD_RATE * camp1.multiplier).toFixed(2));

      const co2Save2 = 2.4;
      const coins2 = Number((co2Save2 * env.BASE_CARBON_REWARD_RATE * camp2.multiplier).toFixed(2));

      return {
        recommendations: [
          {
            title: "Earn 50% more Carbon Coins on BMTC Route 12",
            description:
              "Take underutilized BMTC Route 12 Green Feeder during off-peak hours (11:00–16:00 IST) to earn a 1.5x reward multiplier.",
            transport_mode: "bus",
            estimated_co2_savings: co2Save1,
            campaign_id: camp1.id,
            multiplier: camp1.multiplier,
            estimated_extra_coins: coins1,
            reason: "Supports underutilized electric bus feeder occupancy while cutting private car emissions."
          },
          {
            title: "Combine Namma Metro + Yulu E-Bike for 1.75x Coins",
            description:
              "Use Namma Metro Purple Line for the trunk corridor and complete the final 800m on a zero-emission E-Bike or walk.",
            transport_mode: "metro",
            estimated_co2_savings: co2Save2,
            campaign_id: camp2.id,
            multiplier: camp2.multiplier,
            estimated_extra_coins: coins2,
            reason: "Eliminates tailpipe emissions on congested urban arterials and maximizes campaign multiplier."
          }
        ],
        personalized_message: `You have saved ${
          wallet?.lifetime_co2_saved ?? 0
        } kg CO2e across ${userJourneys.length} journeys. Choosing off-peak public transit and micro-mobility unlocks up to 1.75x Carbon Coins!`
      };
    };

    const prompt = `Analyze the supplied commuter activity and available eco campaigns.
Available campaigns: ${JSON.stringify(
      activeCampaigns.map((c) => ({
        id: c.id,
        name: c.campaign_name,
        multiplier: c.multiplier,
        modes: c.eligible_modes
      }))
    )}
User lifetime CO2 saved: ${wallet?.lifetime_co2_saved ?? 0} kg.
Base reward rate: ${env.BASE_CARBON_REWARD_RATE} coins/kg.
Only recommend campaigns supplied in the input. Never invent reward multipliers.
Return structured JSON matching the Eco-Recommendation schema.`;

    const result = await executeStructuredGeminiPrompt<AIEcoRecommendationResponse>({
      taskName: "eco_recommendations",
      userPrompt: prompt,
      schema: aiEcoRecommendationResponseSchema,
      fallbackGenerator: fallbackBuilder
    });

    // Verify every campaign_id and multiplier against administrator-configured database records
    const validCampaignMap = new Map(activeCampaigns.map((c) => [c.id, c]));
    for (const rec of result.data.recommendations) {
      const dbCamp = validCampaignMap.get(rec.campaign_id);
      if (!dbCamp) {
        return { data: fallbackBuilder(), source: "DETERMINISTIC_FALLBACK" };
      }
      rec.multiplier = dbCamp.multiplier;
      rec.estimated_extra_coins = Number(
        (rec.estimated_co2_savings * env.BASE_CARBON_REWARD_RATE * dbCamp.multiplier).toFixed(2)
      );
    }

    return result;
  }
};
