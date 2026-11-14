import crypto from "crypto";
import { Router } from "express";
import { journeySchema } from "@omnitransit/shared";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { db, JourneyRecord, JourneySegmentRecord } from "../repositories/database.repository";
import { carbonService } from "../services/carbon/carbon.service";
import { routingService } from "../services/routing/routing.service";
import { emitRealtimeEvent } from "../sockets";

const router = Router();

router.post("/plan", requireAuth, validateBody(journeySchema), (req, res) => {
  const userId = req.user!.id;
  const body = req.body;

  // Check if a cached route alternative was selected, otherwise compute alternatives
  let selectedAlternative = body.selectedRouteId
    ? routingService.getRouteById(body.selectedRouteId)
    : null;

  const generated = routingService.generateAlternatives({
    origin: body.origin,
    destination: body.destination,
    originLabel: body.originLabel,
    destinationLabel: body.destinationLabel,
    routingPreference: body.routingPreference,
    departureTime: body.departureTime,
    maximumBudget: body.maximumBudget,
    maxWalkingDistance: body.maxWalkingDistance,
    saferouteEnabled: body.saferouteEnabled,
    womenNightMode: body.womenNightMode,
    weatherAvoidance: body.weatherAvoidance,
    preferredModes: body.preferredModes
  });

  if (!selectedAlternative) {
    selectedAlternative = generated.alternatives[0];
  }

  const now = new Date().toISOString();
  const journeyId = crypto.randomUUID();

  const journeyRecord: JourneyRecord = {
    id: journeyId,
    user_id: userId,
    origin: body.origin,
    destination: body.destination,
    origin_label: selectedAlternative.originLabel,
    destination_label: selectedAlternative.destinationLabel,
    routing_preference: body.routingPreference,
    saferoute_enabled: Boolean(body.saferouteEnabled),
    estimated_cost: selectedAlternative.totalCostInr,
    actual_cost: null,
    estimated_duration: selectedAlternative.totalDurationMinutes,
    actual_duration: null,
    estimated_distance: selectedAlternative.totalDistanceKm,
    estimated_co2: selectedAlternative.estimatedCo2Kg,
    baseline_co2: selectedAlternative.baselineCo2Kg,
    carbon_saved: selectedAlternative.co2SavedKg,
    status: "planned",
    route_snapshot: selectedAlternative,
    created_at: now
  };

  const state = db.getState();
  state.journeys.unshift(journeyRecord);

  const segmentRecords: JourneySegmentRecord[] = selectedAlternative.segments.map((seg) => ({
    id: crypto.randomUUID(),
    journey_id: journeyId,
    sequence_number: seg.sequenceNumber,
    transport_mode: seg.transportMode,
    from_stop_name: seg.fromStopName,
    to_stop_name: seg.toStopName,
    start_location: seg.startLocation,
    end_location: seg.endLocation,
    route_geometry: seg.geometry,
    distance_km: seg.distanceKm,
    duration_minutes: seg.durationMinutes,
    cost: seg.costInr,
    co2_emissions: seg.co2Kg,
    safety_score: seg.safetyScore,
    weather_risk: seg.weatherRisk,
    route_line_name: seg.routeLineName,
    created_at: now
  }));

  state.journey_segments.push(...segmentRecords);
  db.saveState();

  res.status(201).json({
    success: true,
    data: {
      journey: journeyRecord,
      segments: segmentRecords,
      selectedRoute: selectedAlternative,
      alternatives: generated.alternatives
    },
    message: "Multi-modal journey planned and recorded"
  });
});

router.get("/", requireAuth, (req, res) => {
  const state = db.getState();
  const journeys = state.journeys.filter((j) => j.user_id === req.user!.id);
  res.json({
    success: true,
    data: journeys,
    message: "User journeys retrieved"
  });
});

router.get("/:id", requireAuth, (req, res) => {
  const state = db.getState();
  const journey = state.journeys.find((j) => j.id === req.params.id);

  if (!journey) {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Journey not found",
        details: []
      }
    });
    return;
  }

  if (journey.user_id !== req.user!.id && req.user!.role !== "city_admin") {
    res.status(403).json({
      success: false,
      error: {
        code: "FORBIDDEN",
        message: "You are not authorized to access another user's journey",
        details: []
      }
    });
    return;
  }

  const segments = state.journey_segments
    .filter((s) => s.journey_id === journey.id)
    .sort((a, b) => a.sequence_number - b.sequence_number);

  res.json({
    success: true,
    data: {
      journey,
      segments
    },
    message: "Journey details retrieved"
  });
});

router.get("/:id/segments", requireAuth, (req, res) => {
  const state = db.getState();
  const journey = state.journeys.find((j) => j.id === req.params.id);

  if (!journey) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Journey not found", details: [] }
    });
    return;
  }

  if (journey.user_id !== req.user!.id && req.user!.role !== "city_admin") {
    res.status(403).json({
      success: false,
      error: { code: "FORBIDDEN", message: "Unauthorized", details: [] }
    });
    return;
  }

  const segments = state.journey_segments
    .filter((s) => s.journey_id === journey.id)
    .sort((a, b) => a.sequence_number - b.sequence_number);

  res.json({
    success: true,
    data: segments,
    message: "Journey segments retrieved"
  });
});

router.post("/:id/start", requireAuth, (req, res) => {
  const state = db.getState();
  const journey = state.journeys.find((j) => j.id === req.params.id);

  if (!journey || journey.user_id !== req.user!.id) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Journey not found", details: [] }
    });
    return;
  }

  journey.status = "active";
  journey.started_at = new Date().toISOString();
  db.saveState();

  emitRealtimeEvent(
    "journey:status",
    { journeyId: journey.id, status: "active", startedAt: journey.started_at },
    `user:${req.user!.id}`
  );

  res.json({
    success: true,
    data: journey,
    message: "Journey navigation started"
  });
});

router.post("/:id/complete", requireAuth, (req, res) => {
  const state = db.getState();
  const journey = state.journeys.find((j) => j.id === req.params.id);

  if (!journey || journey.user_id !== req.user!.id) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Journey not found", details: [] }
    });
    return;
  }

  if (journey.status === "cancelled") {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_STATE",
        message: "Cannot complete a cancelled journey",
        details: []
      }
    });
    return;
  }

  const now = new Date().toISOString();
  journey.status = "completed";
  if (!journey.started_at) {
    journey.started_at = now;
  }
  journey.completed_at = now;
  journey.actual_cost = journey.estimated_cost;
  journey.actual_duration = journey.estimated_duration;

  // Issue Carbon Coins atomically & idempotently
  const rewardOutcome = carbonService.creditJourneyCompletionReward(req.user!.id, journey.id);
  journey.carbon_saved = rewardOutcome.metrics.co2SavedKg;
  db.saveState();

  emitRealtimeEvent(
    "wallet:updated",
    {
      wallet: rewardOutcome.wallet,
      transaction: rewardOutcome.transaction,
      journeyId: journey.id
    },
    `user:${req.user!.id}`
  );

  res.json({
    success: true,
    data: {
      journey,
      reward: rewardOutcome
    },
    message: rewardOutcome.alreadyCredited
      ? "Journey already completed; duplicate reward prevented"
      : `Journey completed! Earned +${rewardOutcome.transaction?.amount ?? 0} Carbon Coins.`
  });
});

router.post("/:id/cancel", requireAuth, (req, res) => {
  const state = db.getState();
  const journey = state.journeys.find((j) => j.id === req.params.id);

  if (!journey || journey.user_id !== req.user!.id) {
    res.status(404).json({
      success: false,
      error: { code: "NOT_FOUND", message: "Journey not found", details: [] }
    });
    return;
  }

  if (journey.status === "completed") {
    res.status(400).json({
      success: false,
      error: {
        code: "INVALID_STATE",
        message: "Completed journeys cannot be cancelled",
        details: []
      }
    });
    return;
  }

  journey.status = "cancelled";
  db.saveState();

  res.json({
    success: true,
    data: journey,
    message: "Journey cancelled"
  });
});

export default router;
