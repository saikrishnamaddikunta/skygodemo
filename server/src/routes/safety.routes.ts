import { Router } from "express";
import { safetyEvaluationSchema, shareJourneySchema } from "@omnitransit/shared";
import { requireAuth } from "../middleware/auth.middleware";
import { getRequiredParam, validateBody } from "../middleware/validate.middleware";
import { safetyService } from "../services/safety/safety.service";

const router = Router();

router.post("/evaluate", requireAuth, validateBody(safetyEvaluationSchema), (req, res) => {
  const evaluation = safetyService.evaluateCorridorSafety(req.body);
  res.json({
    success: true,
    data: evaluation,
    message: "SafeRoute corridor evaluation completed"
  });
});

router.get("/nearby", requireAuth, (req, res) => {
  const lat = Number(req.query.latitude) || 12.9756;
  const lon = Number(req.query.longitude) || 77.6068;
  const radiusKm = Number(req.query.radiusKm) || 5;

  const indicators = safetyService.getNearbySafetyIndicators(lat, lon, radiusKm);
  res.json({
    success: true,
    data: indicators,
    message: "Nearby safety indicators retrieved"
  });
});

router.get("/zones", requireAuth, (_req, res) => {
  const zones = safetyService.getSafetyZonesAndHeatmap();
  res.json({
    success: true,
    data: zones,
    message: "Safety zones and hub indicators retrieved"
  });
});

router.post("/share-journey", requireAuth, validateBody(shareJourneySchema), (req, res, next) => {
  try {
    const share = safetyService.shareJourney({
      userId: req.user!.id,
      journeyId: req.body.journeyId,
      contactIds: req.body.contactIds,
      enableLiveLocation: req.body.enableLiveLocation,
      note: req.body.note
    });
    res.status(201).json({
      success: true,
      data: share,
      message: "Live journey shared with trusted contacts"
    });
  } catch (err) {
    next(err);
  }
});

router.delete("/share-journey/:id", requireAuth, (req, res, next) => {
  try {
    const shareId = getRequiredParam(req, "id");
    const stopped = safetyService.stopSharingJourney(req.user!.id, shareId);
    res.json({
      success: true,
      data: stopped,
      message: "Live journey sharing stopped"
    });
  } catch (err) {
    next(err);
  }
});

export default router;
