import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { weatherService } from "../services/weather/weather.service";
import { emitRealtimeEvent } from "../sockets";

const router = Router();

router.get("/current", (req, res) => {
  const lat = Number(req.query.latitude) || 12.9716;
  const lon = Number(req.query.longitude) || 77.5946;
  const city = (req.query.city as string) || "Bengaluru";

  const current = weatherService.getCurrentWeather(lat, lon, city);
  res.json({
    success: true,
    data: current,
    message: "Current weather conditions retrieved"
  });
});

router.get("/forecast", (req, res) => {
  const city = (req.query.city as string) || "Bengaluru";
  const forecast = weatherService.getForecast(city);
  res.json({
    success: true,
    data: forecast,
    message: "Weather forecast retrieved"
  });
});

router.get("/alerts", (_req, res) => {
  const alertsAndZones = weatherService.getAlertsAndFloodZones();
  res.json({
    success: true,
    data: alertsAndZones,
    message: "Weather alerts and active flood zones retrieved"
  });
});

router.get("/route-impact", requireAuth, (req, res) => {
  const originLat = Number(req.query.originLat) || 12.9756;
  const originLon = Number(req.query.originLon) || 77.6068;
  const destLat = Number(req.query.destLat) || 12.9352;
  const destLon = Number(req.query.destLon) || 77.6245;

  const impact = weatherService.evaluateRouteWeatherImpact(
    { latitude: originLat, longitude: originLon },
    { latitude: destLat, longitude: destLon }
  );

  res.json({
    success: true,
    data: impact,
    message: "Route weather and flood hazard impact evaluated"
  });
});

router.post("/refresh", requireAuth, (req, res) => {
  const simulateDisruption =
    req.body && typeof req.body.simulateDisruption === "boolean"
      ? req.body.simulateDisruption
      : undefined;

  const updatedState = weatherService.refreshOrSimulateWeather({ simulateDisruption });

  emitRealtimeEvent("weather:updated", updatedState);

  res.json({
    success: true,
    data: updatedState,
    message: updatedState.disruption_active
      ? "[DEV FIXTURE] Heavy rainfall & storm-drain waterlogging disruption activated"
      : "Weather conditions restored to normal baseline"
  });
});

export default router;
