import { Router } from "express";
import { aiTravelAssistantRequestSchema, routingAlternativesRequestSchema } from "@omnitransit/shared";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { ecoRecommendationService } from "../services/ai/eco-recommendation.service";
import { routeExplanationService } from "../services/ai/route-explanation.service";
import { travelAssistantService } from "../services/ai/travel-assistant.service";
import { routingService } from "../services/routing/routing.service";

const router = Router();

router.post("/route-explanation", requireAuth, async (req, res, next) => {
  try {
    let alternatives = req.body.alternatives;

    if (!Array.isArray(alternatives) || alternatives.length === 0) {
      const parsed = routingAlternativesRequestSchema.parse(req.body);
      alternatives = routingService.generateAlternatives(parsed).alternatives;
    }

    const result = await routeExplanationService.explainRoutes({
      alternatives,
      selectedPreference: req.body.routingPreference || "balanced",
      saferouteEnabled: req.body.saferouteEnabled
    });

    res.json({
      success: true,
      data: result,
      message: `Route explanation generated (${result.source})`
    });
  } catch (err) {
    next(err);
  }
});

router.post("/eco-recommendations", requireAuth, async (req, res, next) => {
  try {
    const result = await ecoRecommendationService.generateEcoRecommendations(req.user!.id);
    res.json({
      success: true,
      data: result,
      message: `Personalized eco-recommendations generated (${result.source})`
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/travel-assistant",
  requireAuth,
  validateBody(aiTravelAssistantRequestSchema),
  async (req, res, next) => {
    try {
      const result = await travelAssistantService.askAssistant({
        userId: req.user!.id,
        prompt: req.body.prompt
      });
      res.json({
        success: true,
        data: result,
        message: `Travel assistant response ready (${result.source})`
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
