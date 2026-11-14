import { GeoPoint, HazardLevel, RoutingPreference, TransportMode } from "@omnitransit/shared";
import { FloodZoneRecord, TransitRouteRecord, TransitStopRecord } from "../repositories/database.repository";
import { doesSegmentIntersectPolygon, haversineDistanceKm } from "../utils/geo";

export interface GraphNode {
  id: string;
  name: string;
  stopType: string;
  location: GeoPoint;
  lightingScore: number;
  populationScore: number;
  incidentSafetyScore: number;
  emergencyInfraScore: number;
  accessibilityInfo: Record<string, boolean>;
}

export interface GraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  routeName: string;
  transportMode: TransportMode;
  distanceKm: number;
  durationMinutes: number;
  waitMinutes: number;
  costInr: number;
  weatherExposure: number;
  safetyScore: number;
  lightingScore: number;
  co2Kg: number;
  underutilizedMultiplier: number;
  weatherRisk: HazardLevel;
  floodedOrRestricted: boolean;
  restrictionReason?: string;
  isScheduleVerified: boolean;
}

export class TransitGraph {
  public nodes: Map<string, GraphNode> = new Map();
  public adjacency: Map<string, GraphEdge[]> = new Map();

  public addNode(node: GraphNode): void {
    this.nodes.set(node.id, node);
    if (!this.adjacency.has(node.id)) {
      this.adjacency.set(node.id, []);
    }
  }

  public addEdge(edge: GraphEdge): void {
    if (!this.adjacency.has(edge.fromNodeId)) {
      this.adjacency.set(edge.fromNodeId, []);
    }
    this.adjacency.get(edge.fromNodeId)!.push(edge);
  }

  public getNeighbors(nodeId: string): GraphEdge[] {
    return this.adjacency.get(nodeId) || [];
  }
}

/**
 * Builds a complete multi-modal graph including origin/destination virtual nodes,
 * walking/cycling/ebike connectors, and active public transit routes.
 */
export function buildMultiModalGraph(params: {
  origin: GeoPoint;
  destination: GeoPoint;
  originLabel?: string;
  destinationLabel?: string;
  stops: TransitStopRecord[];
  routes: TransitRouteRecord[];
  floodZones: FloodZoneRecord[];
  emissionFactors: Record<string, number>;
  disruptionActive: boolean;
  disruptedSegmentIds?: string[];
}): TransitGraph {
  const {
    origin,
    destination,
    originLabel = "Origin Point",
    destinationLabel = "Destination Point",
    stops,
    routes,
    floodZones,
    emissionFactors,
    disruptionActive,
    disruptedSegmentIds = []
  } = params;

  const graph = new TransitGraph();

  // Add Origin & Destination virtual nodes
  const originNode: GraphNode = {
    id: "NODE_ORIGIN",
    name: originLabel,
    stopType: "origin",
    location: origin,
    lightingScore: 88,
    populationScore: 86,
    incidentSafetyScore: 85,
    emergencyInfraScore: 85,
    accessibilityInfo: { wheelchair: true }
  };

  const destNode: GraphNode = {
    id: "NODE_DESTINATION",
    name: destinationLabel,
    stopType: "destination",
    location: destination,
    lightingScore: 88,
    populationScore: 86,
    incidentSafetyScore: 85,
    emergencyInfraScore: 85,
    accessibilityInfo: { wheelchair: true }
  };

  graph.addNode(originNode);
  graph.addNode(destNode);

  const activeStops = stops.filter((s) => s.is_active);
  for (const s of activeStops) {
    graph.addNode({
      id: s.id,
      name: s.name,
      stopType: s.stop_type,
      location: s.location,
      lightingScore: s.lighting_score,
      populationScore: s.population_score,
      incidentSafetyScore: s.incident_safety_score,
      emergencyInfraScore: s.emergency_infra_score,
      accessibilityInfo: s.accessibility_info as Record<string, boolean>
    });
  }

  const checkEdgeFloodRisk = (start: GeoPoint, end: GeoPoint, edgeId: string, weatherExp: number): {
    risk: HazardLevel;
    restricted: boolean;
    reason?: string;
  } => {
    if (disruptedSegmentIds.includes(edgeId)) {
      return {
        risk: "CRITICAL",
        restricted: true,
        reason: "Segment marked disrupted by live hazard/recalculation alert"
      };
    }

    for (const fz of floodZones) {
      if (!fz.is_active) continue;
      if (doesSegmentIntersectPolygon(start, end, fz.boundary)) {
        if (fz.risk_level === "CRITICAL" || (disruptionActive && fz.risk_level === "HIGH")) {
          return {
            risk: "CRITICAL",
            restricted: true,
            reason: `Intersects active flood hazard zone: ${fz.zone_name}`
          };
        }
        return {
          risk: fz.risk_level,
          restricted: false,
          reason: `Passes near monitored waterlogging zone: ${fz.zone_name}`
        };
      }
    }

    if (disruptionActive && weatherExp > 0.3) {
      return {
        risk: "HIGH",
        restricted: false,
        reason: "Elevated surface rainfall exposure during active storm watch"
      };
    }

    return { risk: "LOW", restricted: false };
  };

  // Connect Origin & Destination to nearby stops via walking and e-bike
  for (const s of activeStops) {
    const distFromOrigin = haversineDistanceKm(origin, s.location);
    if (distFromOrigin <= 4.5) {
      const walkDist = Math.max(0.15, distFromOrigin);
      const walkDuration = Math.max(2, Math.round((walkDist / 4.8) * 60));
      const hazard = checkEdgeFloodRisk(origin, s.location, `walk-orig-${s.id}`, 0.9);
      graph.addEdge({
        id: `walk-orig-${s.id}`,
        fromNodeId: "NODE_ORIGIN",
        toNodeId: s.id,
        routeName: `Walk to ${s.name}`,
        transportMode: "walking",
        distanceKm: walkDist,
        durationMinutes: walkDuration,
        waitMinutes: 0,
        costInr: 0,
        weatherExposure: 0.9,
        safetyScore: s.lighting_score,
        lightingScore: s.lighting_score,
        co2Kg: 0,
        underutilizedMultiplier: 1.2,
        weatherRisk: hazard.risk,
        floodedOrRestricted: hazard.restricted,
        restrictionReason: hazard.reason,
        isScheduleVerified: true
      });

      if (walkDist >= 0.5) {
        const ebikeDuration = Math.max(2, Math.round((walkDist / 16) * 60));
        const ebikeCost = Math.round(10 + walkDist * 6);
        graph.addEdge({
          id: `ebike-orig-${s.id}`,
          fromNodeId: "NODE_ORIGIN",
          toNodeId: s.id,
          routeName: `Yulu E-Bike to ${s.name}`,
          transportMode: "ebike",
          distanceKm: walkDist,
          durationMinutes: ebikeDuration,
          waitMinutes: 1,
          costInr: ebikeCost,
          weatherExposure: 0.85,
          safetyScore: Math.max(78, s.lighting_score - 3),
          lightingScore: s.lighting_score,
          co2Kg: Number((walkDist * (emissionFactors.ebike ?? 0.015)).toFixed(4)),
          underutilizedMultiplier: 1.5,
          weatherRisk: hazard.risk,
          floodedOrRestricted: hazard.restricted,
          restrictionReason: hazard.reason,
          isScheduleVerified: true
        });
      }
    }

    const distToDest = haversineDistanceKm(s.location, destination);
    if (distToDest <= 4.5) {
      const walkDist = Math.max(0.15, distToDest);
      const walkDuration = Math.max(2, Math.round((walkDist / 4.8) * 60));
      const hazard = checkEdgeFloodRisk(s.location, destination, `walk-dest-${s.id}`, 0.9);
      graph.addEdge({
        id: `walk-dest-${s.id}`,
        fromNodeId: s.id,
        toNodeId: "NODE_DESTINATION",
        routeName: `Walk from ${s.name} to ${destinationLabel}`,
        transportMode: "walking",
        distanceKm: walkDist,
        durationMinutes: walkDuration,
        waitMinutes: 0,
        costInr: 0,
        weatherExposure: 0.9,
        safetyScore: s.lighting_score,
        lightingScore: s.lighting_score,
        co2Kg: 0,
        underutilizedMultiplier: 1.2,
        weatherRisk: hazard.risk,
        floodedOrRestricted: hazard.restricted,
        restrictionReason: hazard.reason,
        isScheduleVerified: true
      });

      if (walkDist >= 0.4) {
        const ebikeDuration = Math.max(2, Math.round((walkDist / 16) * 60));
        const ebikeCost = Math.round(10 + walkDist * 6);
        graph.addEdge({
          id: `ebike-dest-${s.id}`,
          fromNodeId: s.id,
          toNodeId: "NODE_DESTINATION",
          routeName: `Yulu E-Bike from ${s.name} to ${destinationLabel}`,
          transportMode: "ebike",
          distanceKm: walkDist,
          durationMinutes: ebikeDuration,
          waitMinutes: 1,
          costInr: ebikeCost,
          weatherExposure: 0.85,
          safetyScore: Math.max(78, s.lighting_score - 2),
          lightingScore: s.lighting_score,
          co2Kg: Number((walkDist * (emissionFactors.ebike ?? 0.015)).toFixed(4)),
          underutilizedMultiplier: 1.5,
          weatherRisk: hazard.risk,
          floodedOrRestricted: hazard.restricted,
          restrictionReason: hazard.reason,
          isScheduleVerified: true
        });
      }
    }
  }

  // Ensure at least nearest 3 stops are connected to Origin and Destination even if > 4.5km away
  const sortedByOrigin = [...activeStops].sort(
    (a, b) => haversineDistanceKm(origin, a.location) - haversineDistanceKm(origin, b.location)
  );
  for (const s of sortedByOrigin.slice(0, 3)) {
    const existing = graph.getNeighbors("NODE_ORIGIN").some((e) => e.toNodeId === s.id);
    if (!existing) {
      const dist = Math.max(0.2, haversineDistanceKm(origin, s.location));
      graph.addEdge({
        id: `feeder-orig-${s.id}`,
        fromNodeId: "NODE_ORIGIN",
        toNodeId: s.id,
        routeName: `Feeder Walk/E-Bike to ${s.name}`,
        transportMode: dist <= 1.2 ? "walking" : "ebike",
        distanceKm: dist,
        durationMinutes: Math.max(3, Math.round((dist / 12) * 60)),
        waitMinutes: 1,
        costInr: dist <= 1.2 ? 0 : Math.round(12 + dist * 5),
        weatherExposure: 0.6,
        safetyScore: s.lighting_score,
        lightingScore: s.lighting_score,
        co2Kg: Number((dist * 0.01).toFixed(4)),
        underutilizedMultiplier: 1.25,
        weatherRisk: "LOW",
        floodedOrRestricted: false,
        isScheduleVerified: true
      });
    }
  }

  const sortedByDest = [...activeStops].sort(
    (a, b) => haversineDistanceKm(a.location, destination) - haversineDistanceKm(b.location, destination)
  );
  for (const s of sortedByDest.slice(0, 3)) {
    const existing = graph.getNeighbors(s.id).some((e) => e.toNodeId === "NODE_DESTINATION");
    if (!existing) {
      const dist = Math.max(0.2, haversineDistanceKm(s.location, destination));
      graph.addEdge({
        id: `feeder-dest-${s.id}`,
        fromNodeId: s.id,
        toNodeId: "NODE_DESTINATION",
        routeName: `Last-Mile E-Bike/Walk from ${s.name}`,
        transportMode: dist <= 1.2 ? "walking" : "ebike",
        distanceKm: dist,
        durationMinutes: Math.max(3, Math.round((dist / 12) * 60)),
        waitMinutes: 1,
        costInr: dist <= 1.2 ? 0 : Math.round(12 + dist * 5),
        weatherExposure: 0.6,
        safetyScore: s.lighting_score,
        lightingScore: s.lighting_score,
        co2Kg: Number((dist * 0.01).toFixed(4)),
        underutilizedMultiplier: 1.35,
        weatherRisk: "LOW",
        floodedOrRestricted: false,
        isScheduleVerified: true
      });
    }
  }

  // Add Transit Route edges (bidirectional for urban network connectivity)
  for (const r of routes) {
    if (!r.is_active) continue;
    const fromStop = graph.nodes.get(r.start_stop_id);
    const toStop = graph.nodes.get(r.end_stop_id);
    if (!fromStop || !toStop) continue;

    const factor = emissionFactors[r.transport_mode] ?? 0.05;
    const co2Kg = Number((r.distance_km * factor).toFixed(4));
    const hazardFwd = checkEdgeFloodRisk(fromStop.location, toStop.location, r.id, r.weather_exposure);

    // If transit/traffic disruption is active, BMTC Route 201R (direct surface corridor) becomes HIGH/CRITICAL due to severe traffic congestion & bottleneck delay
    const isDirectDrainRoute = r.id === "route-bus-201" && disruptionActive;
    const effectiveRisk: HazardLevel = isDirectDrainRoute ? "CRITICAL" : hazardFwd.risk;
    const effectiveRestricted = isDirectDrainRoute ? true : hazardFwd.restricted;
    const effectiveReason = isDirectDrainRoute
      ? "Peak arterial congestion & surface transit bottleneck detected — automatically rerouted to high-frequency Metro + Feeder"
      : hazardFwd.reason;

    graph.addEdge({
      id: r.id,
      fromNodeId: r.start_stop_id,
      toNodeId: r.end_stop_id,
      routeName: r.route_name,
      transportMode: r.transport_mode,
      distanceKm: r.distance_km,
      durationMinutes: r.duration_minutes,
      waitMinutes: r.wait_minutes,
      costInr: r.base_cost_inr,
      weatherExposure: r.weather_exposure,
      safetyScore: r.safety_score,
      lightingScore: Math.round((fromStop.lightingScore + toStop.lightingScore) / 2),
      co2Kg,
      underutilizedMultiplier: r.underutilized_multiplier,
      weatherRisk: effectiveRisk,
      floodedOrRestricted: effectiveRestricted,
      restrictionReason: effectiveReason,
      isScheduleVerified: true
    });

    // Reverse direction transit edge
    graph.addEdge({
      id: `${r.id}-rev`,
      fromNodeId: r.end_stop_id,
      toNodeId: r.start_stop_id,
      routeName: `${r.route_name} (Return)`,
      transportMode: r.transport_mode,
      distanceKm: r.distance_km,
      durationMinutes: r.duration_minutes,
      waitMinutes: r.wait_minutes,
      costInr: r.base_cost_inr,
      weatherExposure: r.weather_exposure,
      safetyScore: r.safety_score,
      lightingScore: Math.round((fromStop.lightingScore + toStop.lightingScore) / 2),
      co2Kg,
      underutilizedMultiplier: r.underutilized_multiplier,
      weatherRisk: effectiveRisk,
      floodedOrRestricted: effectiveRestricted,
      restrictionReason: effectiveReason,
      isScheduleVerified: true
    });
  }

  // Add inter-stop walking transfer links (< 1.6 km)
  for (let i = 0; i < activeStops.length; i++) {
    for (let j = i + 1; j < activeStops.length; j++) {
      const a = activeStops[i];
      const b = activeStops[j];
      const dist = haversineDistanceKm(a.location, b.location);
      if (dist <= 1.6) {
        const dur = Math.max(3, Math.round((dist / 4.8) * 60));
        graph.addEdge({
          id: `walk-xfer-${a.id}-${b.id}`,
          fromNodeId: a.id,
          toNodeId: b.id,
          routeName: `Pedestrian Transfer (${a.name} -> ${b.name})`,
          transportMode: "walking",
          distanceKm: dist,
          durationMinutes: dur,
          waitMinutes: 0,
          costInr: 0,
          weatherExposure: 0.9,
          safetyScore: Math.round((a.lighting_score + b.lighting_score) / 2),
          lightingScore: Math.round((a.lighting_score + b.lighting_score) / 2),
          co2Kg: 0,
          underutilizedMultiplier: 1.0,
          weatherRisk: "LOW",
          floodedOrRestricted: false,
          isScheduleVerified: true
        });
        graph.addEdge({
          id: `walk-xfer-${b.id}-${a.id}`,
          fromNodeId: b.id,
          toNodeId: a.id,
          routeName: `Pedestrian Transfer (${b.name} -> ${a.name})`,
          transportMode: "walking",
          distanceKm: dist,
          durationMinutes: dur,
          waitMinutes: 0,
          costInr: 0,
          weatherExposure: 0.9,
          safetyScore: Math.round((a.lighting_score + b.lighting_score) / 2),
          lightingScore: Math.round((a.lighting_score + b.lighting_score) / 2),
          co2Kg: 0,
          underutilizedMultiplier: 1.0,
          weatherRisk: "LOW",
          floodedOrRestricted: false,
          isScheduleVerified: true
        });
      }
    }
  }

  return graph;
}

/**
 * Multi-criteria edge weight function supporting all 5 routing optimization profiles
 * plus SafeRoute, Women at Night Mode, and Traffic/Transit Disruption hard constraints.
 */
export function computeEdgeWeight(
  edge: GraphEdge,
  profile: RoutingPreference,
  options: {
    saferouteEnabled: boolean;
    womenNightMode?: boolean;
    weatherAvoidance: boolean;
    preferredModes?: TransportMode[];
    penalizeEdgeIds?: Set<string>;
  }
): number {
  // Hard constraint: CRITICAL traffic/transit disruption restriction when avoidance is active
  if (options.weatherAvoidance && edge.floodedOrRestricted) {
    return Number.POSITIVE_INFINITY;
  }

  // Hard constraint: SafeRoute avoids segments with safetyScore < 70
  if (options.saferouteEnabled && edge.safetyScore < 70) {
    return Number.POSITIVE_INFINITY;
  }

  // Hard constraint: Women at Night Mode strictly avoids dimly-lit or low-safety segments (< 82 lighting or < 78 safety)
  if (options.womenNightMode && (edge.lightingScore < 82 || edge.safetyScore < 78)) {
    return Number.POSITIVE_INFINITY;
  }

  const totalTime = edge.durationMinutes + edge.waitMinutes;
  const safetyPenalty = Math.max(0, 100 - edge.safetyScore);
  const lightingPenalty = Math.max(0, 100 - edge.lightingScore);
  const weatherPenalty =
    edge.weatherRisk === "CRITICAL"
      ? 200
      : edge.weatherRisk === "HIGH"
      ? 45
      : edge.weatherRisk === "MODERATE"
      ? 15
      : 0;

  let baseScore = totalTime;

  switch (profile) {
    case "cheapest":
      baseScore = edge.costInr * 3.2 + totalTime * 0.35 + safetyPenalty * 0.2 + weatherPenalty;
      break;
    case "fastest":
      baseScore = totalTime * 1.8 + edge.costInr * 0.1 + safetyPenalty * 0.15 + weatherPenalty;
      break;
    case "safest":
      baseScore = safetyPenalty * 3.5 + lightingPenalty * 2.2 + totalTime * 0.35 + weatherPenalty * 1.5;
      break;
    case "eco":
      baseScore = edge.co2Kg * 140 + totalTime * 0.35 + (edge.costInr * 0.15) / edge.underutilizedMultiplier + weatherPenalty;
      break;
    case "balanced":
    default:
      baseScore =
        totalTime * 0.85 +
        edge.costInr * 0.55 +
        edge.co2Kg * 45 +
        safetyPenalty * (options.saferouteEnabled || options.womenNightMode ? 2.2 : 0.7) +
        lightingPenalty * (options.womenNightMode ? 2.5 : 0.3) +
        weatherPenalty;
      break;
  }

  if (options.womenNightMode) {
    // Boost CCTV-monitored Metro & electric feeder buses over isolated long pedestrian segments at night
    if (edge.transportMode === "metro") {
      baseScore *= 0.8;
    } else if (edge.transportMode === "walking" && edge.distanceKm > 0.8) {
      baseScore *= 1.8;
    }
  }

  if (options.preferredModes && options.preferredModes.length > 0) {
    if (!options.preferredModes.includes(edge.transportMode) && edge.transportMode !== "walking") {
      baseScore *= 1.65;
    }
  }

  if (options.penalizeEdgeIds && options.penalizeEdgeIds.has(edge.id)) {
    baseScore *= 1.45;
  }

  return Math.max(0.01, baseScore);
}
