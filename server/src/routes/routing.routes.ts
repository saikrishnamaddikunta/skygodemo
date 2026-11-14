import { Router } from "express";
import {
  nearbyTransitQuerySchema,
  recalculateRouteSchema,
  routingAlternativesRequestSchema
} from "@omnitransit/shared";
import { requireAuth } from "../middleware/auth.middleware";
import { getRequiredParam, validateBody, validateQuery } from "../middleware/validate.middleware";
import { routingService } from "../services/routing/routing.service";

const router = Router();

router.post(
  "/alternatives",
  requireAuth,
  validateBody(routingAlternativesRequestSchema),
  (req, res) => {
    const result = routingService.generateAlternatives(req.body);
    res.json({
      success: true,
      data: result,
      message: `Generated ${result.alternatives.length} multi-modal route alternatives`
    });
  }
);

router.post(
  "/recalculate",
  requireAuth,
  validateBody(recalculateRouteSchema),
  (req, res) => {
    const {
      currentLocation,
      destination,
      routingPreference,
      saferouteEnabled,
      womenNightMode,
      disruptedSegmentIds,
      reason
    } = req.body;

    const result = routingService.generateAlternatives({
      origin: currentLocation,
      destination,
      originLabel: "Current Commuter Location",
      destinationLabel: "Journey Destination",
      routingPreference,
      saferouteEnabled,
      womenNightMode,
      weatherAvoidance: true,
      disruptedSegmentIds
    });

    const primary = result.alternatives[0];
    const requiresConfirmation = Boolean(primary && primary.totalCostInr > 60);

    res.json({
      success: true,
      data: {
        recalculatedRoutes: result.alternatives,
        disruptedSegmentsDetected: result.disruptedSegmentsDetected,
        weatherDisruptionActive: result.weatherDisruptionActive,
        recalculationReason:
          reason ||
          (result.weatherDisruptionActive
            ? "Active traffic congestion & surface transit bottleneck detected — dynamically rerouted via high-frequency Metro + Feeder"
            : "Commuter requested dynamic Smart Mobility route recalculation"),
        requiresCommuterConfirmation: requiresConfirmation
      },
      message: "Alternative routes recalculated around affected segments"
    });
  }
);

router.get(
  "/nearby-transit",
  requireAuth,
  validateQuery(nearbyTransitQuerySchema),
  (req, res) => {
    const { latitude, longitude, radiusMeters } = req.query as unknown as {
      latitude: number;
      longitude: number;
      radiusMeters: number;
    };
    const nearby = routingService.getNearbyTransit(latitude, longitude, radiusMeters);
    res.json({
      success: true,
      data: nearby,
      message: "Nearby transit hubs and connecting routes retrieved"
    });
  }
);

router.get("/route/:id", requireAuth, (req, res, next) => {
  try {
    const routeId = getRequiredParam(req, "id");
    const route = routingService.getRouteById(routeId);
    if (!route) {
      res.status(404).json({
        success: false,
        error: {
          code: "ROUTE_NOT_FOUND",
          message: "Route ID not found in active cache",
          details: []
        }
      });
      return;
    }

    res.json({
      success: true,
      data: route,
      message: "Route retrieved"
    });
  } catch (err) {
    next(err);
  }
});

export default router;
