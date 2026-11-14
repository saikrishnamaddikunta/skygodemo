import {
  USER_ROLES,
  TRANSPORT_MODES,
  ROUTING_PREFERENCES,
  HAZARD_LEVELS,
  JOURNEY_STATUSES,
  EMERGENCY_STATUSES,
  TRANSACTION_TYPES
} from "../constants";

export type UserRole = (typeof USER_ROLES)[number];
export type TransportMode = (typeof TRANSPORT_MODES)[number];
export type RoutingPreference = (typeof ROUTING_PREFERENCES)[number];
export type HazardLevel = (typeof HAZARD_LEVELS)[number];
export type JourneyStatus = (typeof JOURNEY_STATUSES)[number];
export type EmergencyStatus = (typeof EMERGENCY_STATUSES)[number];
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface RouteSegmentDetail {
  id: string;
  sequenceNumber: number;
  transportMode: TransportMode;
  fromStopId: string;
  fromStopName: string;
  toStopId: string;
  toStopName: string;
  startLocation: GeoPoint;
  endLocation: GeoPoint;
  geometry: GeoPoint[];
  distanceKm: number;
  durationMinutes: number;
  waitMinutes: number;
  costInr: number;
  co2Kg: number;
  safetyScore: number;
  lightingScore: number;
  weatherRisk: HazardLevel;
  routeLineName?: string;
  isScheduleVerified: boolean;
  floodedOrRestricted?: boolean;
  restrictionReason?: string;
}

export interface RouteAlternative {
  id: string;
  profile: RoutingPreference;
  label: string;
  badge: string;
  origin: GeoPoint;
  destination: GeoPoint;
  originLabel: string;
  destinationLabel: string;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  walkingDistanceMeters: number;
  transferCount: number;
  totalWaitMinutes: number;
  totalCostInr: number;
  estimatedCo2Kg: number;
  baselineCo2Kg: number;
  co2SavedKg: number;
  estimatedCarbonCoins: number;
  activeMultiplier: number;
  safetyScore: number;
  safetyConfidence: number;
  weatherRisk: HazardLevel;
  estimatedArrivalIso: string;
  dataFreshness: "LIVE" | "SCHEDULED" | "DEV_FIXTURE";
  segments: RouteSegmentDetail[];
  transfers: Array<{
    stopName: string;
    fromMode: TransportMode;
    toMode: TransportMode;
    waitMinutes: number;
  }>;
  warnings: string[];
  explanation: {
    summary: string;
    reasoning: string[];
    tradeoffs: string[];
    confidence: number;
    generatedBy: "GEMINI_AI" | "DETERMINISTIC_ENGINE";
  };
}
