export const USER_ROLES = [
  "commuter",
  "city_admin",
  "operations_manager",
  "safety_operator"
] as const;

export const TRANSPORT_MODES = [
  "bus",
  "metro",
  "train",
  "walking",
  "cycling",
  "ebike"
] as const;

export const ROUTING_PREFERENCES = [
  "cheapest",
  "fastest",
  "safest",
  "eco",
  "balanced"
] as const;

export const HAZARD_LEVELS = [
  "LOW",
  "MODERATE",
  "HIGH",
  "CRITICAL"
] as const;

export const JOURNEY_STATUSES = [
  "planned",
  "active",
  "completed",
  "cancelled"
] as const;

export const EMERGENCY_STATUSES = [
  "active",
  "acknowledged",
  "resolved",
  "cancelled"
] as const;

export const TRANSACTION_TYPES = [
  "earn",
  "redeem",
  "adjustment"
] as const;

export const DEFAULT_EMISSION_FACTORS: Record<string, number> = {
  petrol_car: 0.192,
  diesel_car: 0.171,
  bus: 0.105,
  metro: 0.035,
  train: 0.041,
  ebike: 0.015,
  walking: 0,
  cycling: 0
};

export const DEFAULT_SAFETY_WEIGHTS = {
  streetLighting: 0.25,
  populationActivity: 0.20,
  historicalIncidentRisk: 0.20,
  emergencyInfrastructure: 0.15,
  publicTransportAccess: 0.10,
  roadAccessibility: 0.10
};

export const INDIA_EMERGENCY_NUMBER = "112";
export const DEFAULT_CURRENCY = "INR";
export const DEFAULT_TIMEZONE = "Asia/Kolkata";
