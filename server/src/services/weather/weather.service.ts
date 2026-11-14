import crypto from "crypto";
import { GeoPoint, HazardLevel } from "@omnitransit/shared";
import { integrationStatus } from "../../config/env";
import { db, FloodZoneRecord } from "../../repositories/database.repository";
import { doesSegmentIntersectPolygon } from "../../utils/geo";

/**
 * Explicit rule-based hazard classification using rainfall, wind speed, and verified flood records.
 */
export function classifyWeatherHazard(params: {
  rainfallMmHr: number;
  windSpeedKmh: number;
  intersectsCriticalFloodZone?: boolean;
  intersectsHighFloodZone?: boolean;
}): HazardLevel {
  if (params.intersectsCriticalFloodZone || params.rainfallMmHr >= 50 || params.windSpeedKmh >= 75) {
    return "CRITICAL";
  }
  if (params.intersectsHighFloodZone || params.rainfallMmHr >= 25 || params.windSpeedKmh >= 50) {
    return "HIGH";
  }
  if (params.rainfallMmHr >= 8 || params.windSpeedKmh >= 30) {
    return "MODERATE";
  }
  return "LOW";
}

export const weatherService = {
  getCurrentWeather(latitude = 12.9716, longitude = 77.5946, city = "Bengaluru") {
    const state = db.getState();
    const sim = state.weather_simulation;

    return {
      location: { latitude, longitude, city },
      temperatureC: sim.temperature_c,
      rainfallMmHr: sim.rainfall_mm_hr,
      windSpeedKmh: sim.wind_speed_kmh,
      humidityPct: sim.disruption_active ? 92 : 68,
      condition: sim.condition_text,
      hazardLevel: sim.hazard_level,
      disruptionActive: sim.disruption_active,
      affectedCorridor: sim.affected_corridor,
      provider: integrationStatus.openWeatherConfigured
        ? "OpenWeatherMap Live Adapter"
        : "OpenWeatherMap Adapter [DEV_FIXTURE]",
      isDevelopmentFixture: !integrationStatus.openWeatherConfigured,
      updatedAt: sim.updated_at
    };
  },

  getForecast(city = "Bengaluru") {
    const state = db.getState();
    const baseRain = state.weather_simulation.rainfall_mm_hr;

    const now = Date.now();
    const slots = [1, 2, 3, 4, 6, 12].map((hoursAhead) => {
      const rain = Number(Math.max(0, baseRain * (1 - hoursAhead * 0.08) + (hoursAhead === 2 ? 6.5 : 0)).toFixed(1));
      const wind = Math.round(state.weather_simulation.wind_speed_kmh + (hoursAhead === 2 ? 8 : -1));
      const hazard = classifyWeatherHazard({ rainfallMmHr: rain, windSpeedKmh: wind });
      return {
        timestamp: new Date(now + hoursAhead * 3600 * 1000).toISOString(),
        hoursAhead,
        temperatureC: Number((state.weather_simulation.temperature_c - hoursAhead * 0.3).toFixed(1)),
        rainfallMmHr: rain,
        windSpeedKmh: wind,
        hazardLevel: hazard,
        condition:
          hazard === "CRITICAL" || hazard === "HIGH"
            ? "Heavy Monsoon Downpour & Waterlogging Risk"
            : hazard === "MODERATE"
            ? "Moderate Showers"
            : "Partly Cloudy"
      };
    });

    return {
      city,
      provider: integrationStatus.openWeatherConfigured
        ? "OpenWeatherMap Forecast"
        : "OpenWeatherMap Forecast [DEV_FIXTURE]",
      isDevelopmentFixture: !integrationStatus.openWeatherConfigured,
      forecasts: slots
    };
  },

  getAlertsAndFloodZones() {
    const state = db.getState();
    return {
      alerts: state.weather_alerts,
      floodZones: state.flood_zones.filter((fz) => fz.is_active),
      disruptionSimulation: state.weather_simulation,
      isDevelopmentFixture: !integrationStatus.openWeatherConfigured
    };
  },

  evaluateRouteWeatherImpact(origin: GeoPoint, destination: GeoPoint) {
    const state = db.getState();
    const activeFloodZones = state.flood_zones.filter((fz) => fz.is_active);
    const intersectingZones: FloodZoneRecord[] = [];

    for (const fz of activeFloodZones) {
      if (doesSegmentIntersectPolygon(origin, destination, fz.boundary)) {
        intersectingZones.push(fz);
      }
    }

    const overallHazard = classifyWeatherHazard({
      rainfallMmHr: state.weather_simulation.rainfall_mm_hr,
      windSpeedKmh: state.weather_simulation.wind_speed_kmh,
      intersectsCriticalFloodZone: intersectingZones.some((z) => z.risk_level === "CRITICAL"),
      intersectsHighFloodZone:
        state.weather_simulation.disruption_active ||
        intersectingZones.some((z) => z.risk_level === "HIGH")
    });

    return {
      overallHazard,
      disruptionActive: state.weather_simulation.disruption_active,
      rainfallMmHr: state.weather_simulation.rainfall_mm_hr,
      intersectingFloodZones: intersectingZones,
      requiresRecalculation:
        overallHazard === "CRITICAL" ||
        overallHazard === "HIGH" ||
        state.weather_simulation.disruption_active,
      recommendation:
        overallHazard === "CRITICAL" || overallHazard === "HIGH"
          ? "Avoid surface bus corridors through low-lying storm drains; prefer elevated Namma Metro + feeder transfer."
          : "Normal multi-modal operations; carry rain protection during afternoon hours."
    };
  },

  /**
   * Toggles or refreshes the development weather disruption fixture to demonstrate
   * automatic route hazard detection and recalculation (Step 6-8 of Minimum Demo Scenario).
   */
  refreshOrSimulateWeather(options?: { simulateDisruption?: boolean }) {
    const state = db.getState();
    const activate =
      options?.simulateDisruption !== undefined
        ? options.simulateDisruption
        : !state.weather_simulation.disruption_active;

    const now = new Date().toISOString();

    if (activate) {
      state.weather_simulation = {
        disruption_active: true,
        rainfall_mm_hr: 48.5,
        wind_speed_kmh: 46,
        temperature_c: 22.1,
        condition_text: "Peak Arterial Congestion & Surface Transit Bottleneck Alert [DEV_FIXTURE]",
        hazard_level: "HIGH",
        affected_corridor: "BMTC Route 201R Direct (MG Road -> Koramangala Arterial Bottleneck)",
        updated_at: now
      };

      const existingAlert = state.weather_alerts.find((a) => a.id === "wa-sim-disruption");
      if (!existingAlert) {
        state.weather_alerts.unshift({
          id: "wa-sim-disruption",
          provider_alert_id: "DEV-FIXTURE-TRAFFIC-01",
          alert_type: "congestion_bottleneck",
          severity: "CRITICAL",
          title: "[DEV FIXTURE] Severe Arterial Traffic Bottleneck on Direct Surface Corridor (Route 201R)",
          description:
            "Simulated peak congestion & surface bottleneck on Koramangala arterial corridor. Direct bus Route 201R delayed; grade-separated Namma Metro via Indiranagar + Route 12 Electric Feeder automatically synchronized.",
          affected_area: state.flood_zones[1]?.boundary || [],
          start_time: now,
          end_time: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          source: "Smart Mobility Disruption Fixture [DEV_FIXTURE]",
          verification_status: "verified",
          created_at: now
        });
      }
    } else {
      state.weather_simulation = {
        disruption_active: false,
        rainfall_mm_hr: 4.2,
        wind_speed_kmh: 16,
        temperature_c: 25.4,
        condition_text: "Smooth Multi-Modal Flow & Synchronized Transit Headways [DEV_FIXTURE]",
        hazard_level: "LOW",
        affected_corridor: "None",
        updated_at: now
      };
      state.weather_alerts = state.weather_alerts.filter((a) => a.id !== "wa-sim-disruption");
    }

    db.saveState();
    return state.weather_simulation;
  },

  createFloodZone(
    actorId: string,
    input: {
      zone_name: string;
      risk_level: HazardLevel;
      risk_score: number;
      source: string;
      is_active: boolean;
      coordinates: GeoPoint[];
    }
  ): FloodZoneRecord {
    const state = db.getState();
    const now = new Date().toISOString();
    const zone: FloodZoneRecord = {
      id: `fz-${crypto.randomUUID().slice(0, 8)}`,
      zone_name: input.zone_name,
      boundary: input.coordinates,
      risk_level: input.risk_level,
      risk_score: input.risk_score,
      source: input.source,
      verified_by: actorId,
      is_active: input.is_active,
      created_at: now,
      updated_at: now
    };
    state.flood_zones.unshift(zone);
    db.saveState();
    return zone;
  },

  updateFloodZone(zoneId: string, updates: Partial<FloodZoneRecord>): FloodZoneRecord {
    const state = db.getState();
    const zone = state.flood_zones.find((z) => z.id === zoneId);
    if (!zone) {
      throw new Error("Flood zone not found");
    }
    if (updates.zone_name !== undefined) zone.zone_name = updates.zone_name;
    if (updates.risk_level !== undefined) zone.risk_level = updates.risk_level;
    if (updates.risk_score !== undefined) zone.risk_score = updates.risk_score;
    if (updates.is_active !== undefined) zone.is_active = updates.is_active;
    if (updates.boundary !== undefined) zone.boundary = updates.boundary;
    zone.updated_at = new Date().toISOString();
    db.saveState();
    return zone;
  },

  deleteFloodZone(zoneId: string): void {
    const state = db.getState();
    const idx = state.flood_zones.findIndex((z) => z.id === zoneId);
    if (idx === -1) {
      throw new Error("Flood zone not found");
    }
    state.flood_zones.splice(idx, 1);
    db.saveState();
  }
};
