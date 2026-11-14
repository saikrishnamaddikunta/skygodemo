import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  DEFAULT_EMISSION_FACTORS,
  DEFAULT_SAFETY_WEIGHTS,
  GeoPoint,
  HazardLevel,
  TransportMode,
  UserRole
} from "@omnitransit/shared";
import { env } from "../config/env";

export interface ProfileRecord {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  password_hash?: string;
  role: UserRole;
  preferred_language: string;
  preferred_currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesRecord {
  id: string;
  user_id: string;
  preferred_modes: TransportMode[];
  max_walking_distance: number;
  max_budget: number | null;
  saferoute_enabled: boolean;
  weather_alerts_enabled: boolean;
  eco_notifications_enabled: boolean;
  accessibility_preferences: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface TransitStopRecord {
  id: string;
  external_id: string;
  name: string;
  stop_type: "bus_stop" | "metro_station" | "train_station" | "mobility_hub";
  location: GeoPoint;
  city: string;
  accessibility_info: {
    wheelchair?: boolean;
    elevator?: boolean;
    tactile_paving?: boolean;
    shelter?: boolean;
  };
  lighting_score: number;
  population_score: number;
  incident_safety_score: number;
  emergency_infra_score: number;
  cctv_verified: boolean;
  is_active: boolean;
  source: string;
  created_at: string;
}

export interface TransitRouteRecord {
  id: string;
  external_id: string;
  route_name: string;
  transport_mode: TransportMode;
  start_stop_id: string;
  end_stop_id: string;
  stop_sequence: string[];
  distance_km: number;
  duration_minutes: number;
  wait_minutes: number;
  base_cost_inr: number;
  weather_exposure: number; // 0 to 1
  safety_score: number; // 0 to 100
  underutilized_multiplier: number;
  utilization_pct: number;
  operator_name: string;
  is_active: boolean;
  source: string;
  created_at: string;
}

export interface FleetVehicleRecord {
  id: string;
  route_id: string;
  route_name: string;
  vehicle_number: string;
  transport_mode: TransportMode;
  current_location: GeoPoint;
  occupancy: number;
  capacity: number;
  status: "active" | "delayed" | "maintenance";
  last_location_update: string;
  source: string;
}

export interface JourneyRecord {
  id: string;
  user_id: string;
  origin: GeoPoint;
  destination: GeoPoint;
  origin_label: string;
  destination_label: string;
  routing_preference: "cheapest" | "fastest" | "safest" | "eco" | "balanced";
  saferoute_enabled: boolean;
  estimated_cost: number;
  actual_cost: number | null;
  estimated_duration: number;
  actual_duration: number | null;
  estimated_distance: number;
  estimated_co2: number;
  baseline_co2: number;
  carbon_saved: number;
  status: "planned" | "active" | "completed" | "cancelled";
  route_snapshot?: unknown;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface JourneySegmentRecord {
  id: string;
  journey_id: string;
  sequence_number: number;
  transport_mode: TransportMode;
  from_stop_name: string;
  to_stop_name: string;
  start_location: GeoPoint;
  end_location: GeoPoint;
  route_geometry: GeoPoint[];
  distance_km: number;
  duration_minutes: number;
  cost: number;
  co2_emissions: number;
  safety_score: number;
  weather_risk: HazardLevel;
  route_line_name?: string;
  created_at: string;
}

export interface SafetyIndicatorRecord {
  id: string;
  location: GeoPoint;
  area_name: string;
  indicator_type:
    | "street_lighting"
    | "population_activity"
    | "historical_incident"
    | "emergency_infrastructure"
    | "cctv_infrastructure"
    | "verified_safe_location"
    | "road_accessibility";
  score: number;
  description: string;
  confidence: number;
  source: string;
  verification_status: "verified" | "unverified";
  observed_at: string;
  expires_at: string;
}

export interface FloodZoneRecord {
  id: string;
  zone_name: string;
  boundary: GeoPoint[];
  risk_level: HazardLevel;
  risk_score: number;
  source: string;
  verified_by?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WeatherAlertRecord {
  id: string;
  provider_alert_id: string;
  alert_type: string;
  severity: HazardLevel;
  title: string;
  description: string;
  affected_area: GeoPoint[];
  start_time: string;
  end_time: string;
  source: string;
  verification_status: "verified" | "unverified";
  created_at: string;
}

export interface EmergencyContactRecord {
  id: string;
  user_id: string;
  contact_name: string;
  phone: string;
  email?: string;
  relationship: string;
  is_verified: boolean;
  notification_preferences: ("in_app" | "live_share")[];
  created_at: string;
}

export interface EmergencyIncidentRecord {
  id: string;
  user_id: string;
  journey_id?: string;
  current_location: GeoPoint;
  message?: string;
  status: "active" | "acknowledged" | "resolved" | "cancelled";
  triggered_at: string;
  resolved_at?: string;
  notification_status: {
    provider: string;
    contacts_notified: Array<{
      contact_id: string;
      contact_name: string;
      channel: string;
      delivery_status: string;
      timestamp: string;
    }>;
    official_112_notice: string;
  };
  activity_log: Array<{
    timestamp: string;
    actor: string;
    action: string;
    note: string;
  }>;
  created_at: string;
}

export interface EmergencyLocationUpdateRecord {
  id: string;
  incident_id: string;
  location: GeoPoint;
  accuracy_meters: number;
  recorded_at: string;
}

export interface CarbonWalletRecord {
  id: string;
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  lifetime_co2_saved: number;
  updated_at: string;
}

export interface CarbonTransactionRecord {
  id: string;
  wallet_id: string;
  user_id: string;
  journey_id?: string;
  transaction_type: "earn" | "redeem" | "adjustment";
  amount: number;
  co2_saved: number;
  multiplier: number;
  description: string;
  idempotency_key: string;
  calculation_version: string;
  created_at: string;
}

export interface EcoCampaignRecord {
  id: string;
  campaign_name: string;
  description: string;
  multiplier: number;
  eligible_routes: string[];
  eligible_modes: string[];
  start_time: string;
  end_time: string;
  daily_reward_limit: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export interface RewardRecord {
  id: string;
  reward_name: string;
  description: string;
  coin_cost: number;
  reward_type: "transit_discount" | "partner_coupon" | "mobility_voucher" | "digital_badge" | "achievement";
  stock: number | null;
  is_active: boolean;
  created_at: string;
}

export interface RewardRedemptionRecord {
  id: string;
  user_id: string;
  reward_id: string;
  reward_name: string;
  coins_spent: number;
  redemption_code: string;
  status: "issued_demo_voucher" | "pending" | "redeemed";
  created_at: string;
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  actor_id: string;
  actor_email?: string;
  actor_role?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface JourneyShareRecord {
  id: string;
  journey_id: string;
  user_id: string;
  contact_ids: string[];
  enable_live_location: boolean;
  share_token: string;
  note?: string;
  is_active: boolean;
  created_at: string;
}

export interface DatabaseState {
  profiles: ProfileRecord[];
  user_preferences: UserPreferencesRecord[];
  transit_stops: TransitStopRecord[];
  transit_routes: TransitRouteRecord[];
  fleet_vehicles: FleetVehicleRecord[];
  journeys: JourneyRecord[];
  journey_segments: JourneySegmentRecord[];
  safety_indicators: SafetyIndicatorRecord[];
  flood_zones: FloodZoneRecord[];
  weather_alerts: WeatherAlertRecord[];
  emergency_contacts: EmergencyContactRecord[];
  emergency_incidents: EmergencyIncidentRecord[];
  emergency_location_updates: EmergencyLocationUpdateRecord[];
  emission_factors: Record<string, number>;
  safety_weights: typeof DEFAULT_SAFETY_WEIGHTS;
  carbon_wallets: CarbonWalletRecord[];
  carbon_transactions: CarbonTransactionRecord[];
  eco_campaigns: EcoCampaignRecord[];
  rewards: RewardRecord[];
  reward_redemptions: RewardRedemptionRecord[];
  notifications: NotificationRecord[];
  audit_logs: AuditLogRecord[];
  journey_shares: JourneyShareRecord[];
  weather_simulation: {
    disruption_active: boolean;
    rainfall_mm_hr: number;
    wind_speed_kmh: number;
    temperature_c: number;
    condition_text: string;
    hazard_level: HazardLevel;
    affected_corridor: string;
    updated_at: string;
  };
}

export function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(`omnitransit_salt_${password}`).digest("hex");
}

function createInitialSeedState(): DatabaseState {
  const now = new Date().toISOString();
  const future60d = new Date(Date.now() + 60 * 86400 * 1000).toISOString();
  const past7d = new Date(Date.now() - 7 * 86400 * 1000).toISOString();

  const commuterId = "11111111-1111-4111-8111-111111111111";
  const adminId = "22222222-2222-4222-8222-222222222222";
  const opsId = "33333333-3333-4333-8333-333333333333";
  const safetyOpId = "44444444-4444-4444-8444-444444444444";

  const stops: TransitStopRecord[] = [
    {
      id: "stop-majestic",
      external_id: "STOP-MAJESTIC",
      name: "Majestic Kempegowda Interchange",
      stop_type: "metro_station",
      location: { latitude: 12.9767, longitude: 77.5713 },
      city: "Bengaluru",
      accessibility_info: { wheelchair: true, elevator: true, tactile_paving: true, shelter: true },
      lighting_score: 90,
      population_score: 96,
      incident_safety_score: 82,
      emergency_infra_score: 94,
      cctv_verified: true,
      is_active: true,
      source: "BMRCL/BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "stop-cubbon",
      external_id: "STOP-CUBBON",
      name: "Cubbon Park Metro & Bus Hub",
      stop_type: "metro_station",
      location: { latitude: 12.9780, longitude: 77.5955 },
      city: "Bengaluru",
      accessibility_info: { wheelchair: true, elevator: true, tactile_paving: true, shelter: true },
      lighting_score: 88,
      population_score: 85,
      incident_safety_score: 90,
      emergency_infra_score: 92,
      cctv_verified: true,
      is_active: true,
      source: "BMRCL GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "stop-mg-road",
      external_id: "STOP-MG-ROAD",
      name: "MG Road Metro & Mobility Hub",
      stop_type: "metro_station",
      location: { latitude: 12.9756, longitude: 77.6068 },
      city: "Bengaluru",
      accessibility_info: { wheelchair: true, elevator: true, tactile_paving: true, shelter: true },
      lighting_score: 95,
      population_score: 94,
      incident_safety_score: 91,
      emergency_infra_score: 93,
      cctv_verified: true,
      is_active: true,
      source: "BMRCL GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "stop-indiranagar",
      external_id: "STOP-INDIRANAGAR",
      name: "Indiranagar Metro Station",
      stop_type: "metro_station",
      location: { latitude: 12.9784, longitude: 77.6387 },
      city: "Bengaluru",
      accessibility_info: { wheelchair: true, elevator: true, tactile_paving: true, shelter: true },
      lighting_score: 92,
      population_score: 90,
      incident_safety_score: 88,
      emergency_infra_score: 89,
      cctv_verified: true,
      is_active: true,
      source: "BMRCL GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "stop-domlur",
      external_id: "STOP-DOMLUR",
      name: "Domlur TTMC Transit Hub",
      stop_type: "bus_stop",
      location: { latitude: 12.9610, longitude: 77.6382 },
      city: "Bengaluru",
      accessibility_info: { wheelchair: true, shelter: true },
      lighting_score: 84,
      population_score: 82,
      incident_safety_score: 85,
      emergency_infra_score: 80,
      cctv_verified: true,
      is_active: true,
      source: "BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "stop-koramangala",
      external_id: "STOP-KORAMANGALA",
      name: "Koramangala Sony World Hub",
      stop_type: "mobility_hub",
      location: { latitude: 12.9352, longitude: 77.6245 },
      city: "Bengaluru",
      accessibility_info: { wheelchair: true, shelter: true },
      lighting_score: 87,
      population_score: 89,
      incident_safety_score: 86,
      emergency_infra_score: 85,
      cctv_verified: true,
      is_active: true,
      source: "BMTC/Yulu Hub [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "stop-jayanagar",
      external_id: "STOP-JAYANAGAR",
      name: "Jayanagar 4th Block TTMC",
      stop_type: "metro_station",
      location: { latitude: 12.9299, longitude: 77.5839 },
      city: "Bengaluru",
      accessibility_info: { wheelchair: true, elevator: true, shelter: true },
      lighting_score: 91,
      population_score: 88,
      incident_safety_score: 90,
      emergency_infra_score: 88,
      cctv_verified: true,
      is_active: true,
      source: "BMRCL/BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "stop-silk-board",
      external_id: "STOP-SILK-BOARD",
      name: "Silk Board Multi-Modal Junction",
      stop_type: "bus_stop",
      location: { latitude: 12.9172, longitude: 77.6227 },
      city: "Bengaluru",
      accessibility_info: { wheelchair: false, shelter: true },
      lighting_score: 74,
      population_score: 86,
      incident_safety_score: 72,
      emergency_infra_score: 76,
      cctv_verified: true,
      is_active: true,
      source: "BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "stop-bellandur",
      external_id: "STOP-BELLANDUR",
      name: "Bellandur EcoSpace ORR Bus Stop",
      stop_type: "bus_stop",
      location: { latitude: 12.9304, longitude: 77.6784 },
      city: "Bengaluru",
      accessibility_info: { wheelchair: true, shelter: true },
      lighting_score: 76,
      population_score: 80,
      incident_safety_score: 78,
      emergency_infra_score: 75,
      cctv_verified: false,
      is_active: true,
      source: "BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "stop-whitefield",
      external_id: "STOP-WHITEFIELD",
      name: "Whitefield (Kadugodi) Metro Terminal",
      stop_type: "metro_station",
      location: { latitude: 12.9850, longitude: 77.7100 },
      city: "Bengaluru",
      accessibility_info: { wheelchair: true, elevator: true, tactile_paving: true, shelter: true },
      lighting_score: 89,
      population_score: 85,
      incident_safety_score: 88,
      emergency_infra_score: 87,
      cctv_verified: true,
      is_active: true,
      source: "BMRCL GTFS [DEV_FIXTURE]",
      created_at: now
    }
  ];

  const routes: TransitRouteRecord[] = [
    // Metro Purple Line links
    {
      id: "route-metro-purple-1",
      external_id: "NML-PURPLE-W1",
      route_name: "Namma Metro Purple Line (Majestic -> Cubbon Park)",
      transport_mode: "metro",
      start_stop_id: "stop-majestic",
      end_stop_id: "stop-cubbon",
      stop_sequence: ["stop-majestic", "stop-cubbon"],
      distance_km: 2.7,
      duration_minutes: 5,
      wait_minutes: 4,
      base_cost_inr: 15,
      weather_exposure: 0.05,
      safety_score: 94,
      underutilized_multiplier: 1.2,
      utilization_pct: 74,
      operator_name: "BMRCL Namma Metro",
      is_active: true,
      source: "BMRCL Schedule [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "route-metro-purple-2",
      external_id: "NML-PURPLE-W2",
      route_name: "Namma Metro Purple Line (Cubbon Park -> MG Road)",
      transport_mode: "metro",
      start_stop_id: "stop-cubbon",
      end_stop_id: "stop-mg-road",
      stop_sequence: ["stop-cubbon", "stop-mg-road"],
      distance_km: 1.4,
      duration_minutes: 3,
      wait_minutes: 3,
      base_cost_inr: 10,
      weather_exposure: 0.05,
      safety_score: 95,
      underutilized_multiplier: 1.2,
      utilization_pct: 78,
      operator_name: "BMRCL Namma Metro",
      is_active: true,
      source: "BMRCL Schedule [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "route-metro-purple-3",
      external_id: "NML-PURPLE-E1",
      route_name: "Namma Metro Purple Line (MG Road -> Indiranagar)",
      transport_mode: "metro",
      start_stop_id: "stop-mg-road",
      end_stop_id: "stop-indiranagar",
      stop_sequence: ["stop-mg-road", "stop-indiranagar"],
      distance_km: 3.6,
      duration_minutes: 7,
      wait_minutes: 4,
      base_cost_inr: 20,
      weather_exposure: 0.05,
      safety_score: 94,
      underutilized_multiplier: 1.25,
      utilization_pct: 68,
      operator_name: "BMRCL Namma Metro",
      is_active: true,
      source: "BMRCL Schedule [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "route-metro-purple-4",
      external_id: "NML-PURPLE-E2",
      route_name: "Namma Metro Purple Line (Indiranagar -> Whitefield)",
      transport_mode: "metro",
      start_stop_id: "stop-indiranagar",
      end_stop_id: "stop-whitefield",
      stop_sequence: ["stop-indiranagar", "stop-whitefield"],
      distance_km: 8.2,
      duration_minutes: 16,
      wait_minutes: 5,
      base_cost_inr: 35,
      weather_exposure: 0.05,
      safety_score: 92,
      underutilized_multiplier: 1.35,
      utilization_pct: 58,
      operator_name: "BMRCL Namma Metro",
      is_active: true,
      source: "BMRCL Schedule [DEV_FIXTURE]",
      created_at: now
    },
    // Metro Green Line link
    {
      id: "route-metro-green-1",
      external_id: "NML-GREEN-S1",
      route_name: "Namma Metro Green Line (Majestic -> Jayanagar)",
      transport_mode: "metro",
      start_stop_id: "stop-majestic",
      end_stop_id: "stop-jayanagar",
      stop_sequence: ["stop-majestic", "stop-jayanagar"],
      distance_km: 5.5,
      duration_minutes: 11,
      wait_minutes: 4,
      base_cost_inr: 25,
      weather_exposure: 0.05,
      safety_score: 93,
      underutilized_multiplier: 1.2,
      utilization_pct: 64,
      operator_name: "BMRCL Namma Metro",
      is_active: true,
      source: "BMRCL Schedule [DEV_FIXTURE]",
      created_at: now
    },
    // BMTC Public Bus Routes
    {
      id: "route-bus-12",
      external_id: "BMTC-12-OFFPEAK",
      route_name: "BMTC Route 12 Green Feeder (Indiranagar -> Domlur -> Koramangala)",
      transport_mode: "bus",
      start_stop_id: "stop-indiranagar",
      end_stop_id: "stop-koramangala",
      stop_sequence: ["stop-indiranagar", "stop-domlur", "stop-koramangala"],
      distance_km: 5.1,
      duration_minutes: 16,
      wait_minutes: 6,
      base_cost_inr: 15,
      weather_exposure: 0.25,
      safety_score: 88,
      underutilized_multiplier: 1.5,
      utilization_pct: 42,
      operator_name: "BMTC Electric Fleet",
      is_active: true,
      source: "BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "route-bus-201",
      external_id: "BMTC-201R",
      route_name: "BMTC Route 201R Direct (MG Road -> Koramangala)",
      transport_mode: "bus",
      start_stop_id: "stop-mg-road",
      end_stop_id: "stop-koramangala",
      stop_sequence: ["stop-mg-road", "stop-koramangala"],
      distance_km: 5.2,
      duration_minutes: 21,
      wait_minutes: 7,
      base_cost_inr: 12,
      weather_exposure: 0.35,
      safety_score: 84,
      underutilized_multiplier: 1.3,
      utilization_pct: 51,
      operator_name: "BMTC",
      is_active: true,
      source: "BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "route-bus-335e",
      external_id: "BMTC-335E",
      route_name: "BMTC Vajra 335E (Majestic -> MG Road -> Domlur -> Bellandur -> Whitefield)",
      transport_mode: "bus",
      start_stop_id: "stop-majestic",
      end_stop_id: "stop-bellandur",
      stop_sequence: ["stop-majestic", "stop-mg-road", "stop-domlur", "stop-bellandur"],
      distance_km: 12.8,
      duration_minutes: 38,
      wait_minutes: 8,
      base_cost_inr: 25,
      weather_exposure: 0.45,
      safety_score: 81,
      underutilized_multiplier: 1.4,
      utilization_pct: 48,
      operator_name: "BMTC Vajra",
      is_active: true,
      source: "BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "route-bus-500d",
      external_id: "BMTC-500D",
      route_name: "BMTC ORR Express 500D (Silk Board -> Bellandur -> Whitefield)",
      transport_mode: "bus",
      start_stop_id: "stop-silk-board",
      end_stop_id: "stop-whitefield",
      stop_sequence: ["stop-silk-board", "stop-bellandur", "stop-whitefield"],
      distance_km: 14.5,
      duration_minutes: 42,
      wait_minutes: 6,
      base_cost_inr: 30,
      weather_exposure: 0.55,
      safety_score: 77,
      underutilized_multiplier: 1.5,
      utilization_pct: 39,
      operator_name: "BMTC ORR Express",
      is_active: true,
      source: "BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "route-bus-jayanagar-kora",
      external_id: "BMTC-25A",
      route_name: "BMTC South Link (Jayanagar -> Koramangala -> Silk Board)",
      transport_mode: "bus",
      start_stop_id: "stop-jayanagar",
      end_stop_id: "stop-koramangala",
      stop_sequence: ["stop-jayanagar", "stop-koramangala"],
      distance_km: 4.6,
      duration_minutes: 15,
      wait_minutes: 5,
      base_cost_inr: 10,
      weather_exposure: 0.25,
      safety_score: 89,
      underutilized_multiplier: 1.35,
      utilization_pct: 46,
      operator_name: "BMTC",
      is_active: true,
      source: "BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    },
    // E-Bike & Micro-mobility Connectors
    {
      id: "route-ebike-indira-kora",
      external_id: "YULU-EB-01",
      route_name: "Yulu E-Bike Greenway (Indiranagar -> Domlur -> Koramangala)",
      transport_mode: "ebike",
      start_stop_id: "stop-indiranagar",
      end_stop_id: "stop-koramangala",
      stop_sequence: ["stop-indiranagar", "stop-domlur", "stop-koramangala"],
      distance_km: 4.8,
      duration_minutes: 14,
      wait_minutes: 1,
      base_cost_inr: 28,
      weather_exposure: 0.85,
      safety_score: 83,
      underutilized_multiplier: 1.75,
      utilization_pct: 35,
      operator_name: "Yulu Smart Mobility",
      is_active: true,
      source: "Yulu Dock Feed [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "route-ebike-mg-cubbon",
      external_id: "YULU-EB-02",
      route_name: "Cubbon Boulevard E-Bike Lane (Cubbon Park -> MG Road)",
      transport_mode: "ebike",
      start_stop_id: "stop-cubbon",
      end_stop_id: "stop-mg-road",
      stop_sequence: ["stop-cubbon", "stop-mg-road"],
      distance_km: 1.5,
      duration_minutes: 5,
      wait_minutes: 1,
      base_cost_inr: 10,
      weather_exposure: 0.75,
      safety_score: 91,
      underutilized_multiplier: 1.5,
      utilization_pct: 44,
      operator_name: "Yulu Smart Mobility",
      is_active: true,
      source: "Yulu Dock Feed [DEV_FIXTURE]",
      created_at: now
    },
    {
      id: "route-kora-silk",
      external_id: "BMTC-KORA-SILK",
      route_name: "BMTC Feeder (Koramangala -> Silk Board)",
      transport_mode: "bus",
      start_stop_id: "stop-koramangala",
      end_stop_id: "stop-silk-board",
      stop_sequence: ["stop-koramangala", "stop-silk-board"],
      distance_km: 2.4,
      duration_minutes: 9,
      wait_minutes: 4,
      base_cost_inr: 10,
      weather_exposure: 0.30,
      safety_score: 82,
      underutilized_multiplier: 1.25,
      utilization_pct: 55,
      operator_name: "BMTC",
      is_active: true,
      source: "BMTC GTFS [DEV_FIXTURE]",
      created_at: now
    }
  ];

  const fleetVehicles: FleetVehicleRecord[] = [
    {
      id: "fleet-1",
      route_id: "route-bus-12",
      route_name: "BMTC Route 12 Green Feeder",
      vehicle_number: "KA-01-F-9212",
      transport_mode: "bus",
      current_location: { latitude: 12.9610, longitude: 77.6382 },
      occupancy: 18,
      capacity: 45,
      status: "active",
      last_location_update: now,
      source: "BMTC AVL Telemetry [DEV_FIXTURE]"
    },
    {
      id: "fleet-2",
      route_id: "route-metro-purple-3",
      route_name: "Namma Metro Purple Line",
      vehicle_number: "BMRCL-TP-204",
      transport_mode: "metro",
      current_location: { latitude: 12.9768, longitude: 77.6215 },
      occupancy: 410,
      capacity: 1200,
      status: "active",
      last_location_update: now,
      source: "BMRCL CBTC Signalling [DEV_FIXTURE]"
    },
    {
      id: "fleet-3",
      route_id: "route-bus-500d",
      route_name: "BMTC ORR Express 500D",
      vehicle_number: "KA-01-FA-4501",
      transport_mode: "bus",
      current_location: { latitude: 12.9304, longitude: 77.6784 },
      occupancy: 22,
      capacity: 50,
      status: "active",
      last_location_update: now,
      source: "BMTC AVL Telemetry [DEV_FIXTURE]"
    },
    {
      id: "fleet-4",
      route_id: "route-ebike-indira-kora",
      route_name: "Yulu E-Bike Pod Cluster",
      vehicle_number: "YULU-BLR-883",
      transport_mode: "ebike",
      current_location: { latitude: 12.9784, longitude: 77.6387 },
      occupancy: 1,
      capacity: 1,
      status: "active",
      last_location_update: now,
      source: "Yulu IoT Telemetry [DEV_FIXTURE]"
    }
  ];

  const safetyIndicators: SafetyIndicatorRecord[] = [
    {
      id: "si-1",
      location: { latitude: 12.9756, longitude: 77.6068 },
      area_name: "MG Road & Brigade Commercial Corridor",
      indicator_type: "street_lighting",
      score: 95,
      description: "High-lumen smart LED street lighting & active commercial frontage until 23:30 IST",
      confidence: 94,
      source: "BBMP Smart City Sensor [DEV_FIXTURE]",
      verification_status: "verified",
      observed_at: now,
      expires_at: future60d
    },
    {
      id: "si-2",
      location: { latitude: 12.9784, longitude: 77.6387 },
      area_name: "Indiranagar 100ft Road Metro Plaza",
      indicator_type: "cctv_infrastructure",
      score: 91,
      description: "BMRCL & Bengaluru Safe City CCTV active coverage + Women's Help Desk",
      confidence: 92,
      source: "Safe City Command Center [DEV_FIXTURE]",
      verification_status: "verified",
      observed_at: now,
      expires_at: future60d
    },
    {
      id: "si-3",
      location: { latitude: 12.9352, longitude: 77.6245 },
      area_name: "Koramangala Sony World Mobility Hub",
      indicator_type: "emergency_infrastructure",
      score: 88,
      description: "24x7 Hoysala Patrol Point & Panic Call Box within 120m",
      confidence: 90,
      source: "Bengaluru City Police [DEV_FIXTURE]",
      verification_status: "verified",
      observed_at: now,
      expires_at: future60d
    },
    {
      id: "si-4",
      location: { latitude: 12.9172, longitude: 77.6227 },
      area_name: "Silk Board Underpass Service Road",
      indicator_type: "road_accessibility",
      score: 65,
      description: "Partial lighting shadow near flyover construction; elevated metro concourse recommended at night",
      confidence: 84,
      source: "Traffic Police Field Audit [DEV_FIXTURE]",
      verification_status: "verified",
      observed_at: now,
      expires_at: future60d
    }
  ];

  const floodZones: FloodZoneRecord[] = [
    {
      id: "fz-bellandur",
      zone_name: "Bellandur - Outer Ring Road Low-Lying Basin",
      boundary: [
        { latitude: 12.922, longitude: 77.660 },
        { latitude: 12.922, longitude: 77.690 },
        { latitude: 12.942, longitude: 77.690 },
        { latitude: 12.942, longitude: 77.660 }
      ],
      risk_level: "HIGH",
      risk_score: 84,
      source: "BBMP / KSNDMC Flood Monitoring Cell [DEV_FIXTURE]",
      verified_by: adminId,
      is_active: true,
      created_at: now,
      updated_at: now
    },
    {
      id: "fz-kora-drain",
      zone_name: "Koramangala Direct Storm Drain Underpass",
      boundary: [
        { latitude: 12.950, longitude: 77.610 },
        { latitude: 12.950, longitude: 77.622 },
        { latitude: 12.962, longitude: 77.622 },
        { latitude: 12.962, longitude: 77.610 }
      ],
      risk_level: "MODERATE",
      risk_score: 62,
      source: "KSNDMC Historical Waterlogging Layer [DEV_FIXTURE]",
      verified_by: adminId,
      is_active: true,
      created_at: now,
      updated_at: now
    }
  ];

  const weatherAlerts: WeatherAlertRecord[] = [
    {
      id: "wa-1",
      provider_alert_id: "IMD-KA-BLR-2026-01",
      alert_type: "rainfall",
      severity: "MODERATE",
      title: "Localized Afternoon Thundershowers & Low-Lying Waterlogging Watch",
      description: "Moderate rainfall (12-22 mm/hr) forecasted across eastern and south-eastern corridors. Underpasses near Bellandur ORR and Koramangala storm drains monitored.",
      affected_area: floodZones[0].boundary,
      start_time: now,
      end_time: future60d,
      source: "IMD / OpenWeather Adapter [DEV_FIXTURE]",
      verification_status: "verified",
      created_at: now
    }
  ];

  const ecoCampaigns: EcoCampaignRecord[] = [
    {
      id: "camp-bmtc-offpeak",
      campaign_name: "BMTC Route 12 Off-Peak Green Boost",
      description: "Earn 1.5x Carbon Coins when choosing BMTC Route 12 or underutilized public buses during off-peak hours.",
      multiplier: 1.5,
      eligible_routes: ["route-bus-12", "route-bus-500d"],
      eligible_modes: ["bus"],
      start_time: past7d,
      end_time: future60d,
      daily_reward_limit: 500,
      is_active: true,
      created_by: adminId,
      created_at: now
    },
    {
      id: "camp-metro-ebike",
      campaign_name: "Namma Metro + Micro-Mobility Zero-Carbon Combo",
      description: "Combine Namma Metro with Walking or E-Bike transfers for a 1.75x Carbon Coin multiplier.",
      multiplier: 1.75,
      eligible_routes: ["route-metro-purple-1", "route-metro-purple-2", "route-metro-purple-3"],
      eligible_modes: ["metro", "ebike", "walking"],
      start_time: past7d,
      end_time: future60d,
      daily_reward_limit: 500,
      is_active: true,
      created_by: adminId,
      created_at: now
    }
  ];

  const rewards: RewardRecord[] = [
    {
      id: "rew-metro-50",
      reward_name: "Namma Metro ₹50 Smart Card Recharge Voucher",
      description: "Redeemable demo voucher code for ₹50 rebate on BMRCL Namma Metro top-up.",
      coin_cost: 40,
      reward_type: "transit_discount",
      stock: 250,
      is_active: true,
      created_at: now
    },
    {
      id: "rew-bmtc-pass",
      reward_name: "BMTC Vajra AC Day Pass 25% Discount",
      description: "Digital coupon code for 25% off a BMTC daily transit pass.",
      coin_cost: 30,
      reward_type: "transit_discount",
      stock: 500,
      is_active: true,
      created_at: now
    },
    {
      id: "rew-yulu-unlock",
      reward_name: "Yulu E-Bike 30-Minute Free Unlock Voucher",
      description: "Zero-emission last-mile micro-mobility ride credit.",
      coin_cost: 25,
      reward_type: "mobility_voucher",
      stock: 400,
      is_active: true,
      created_at: now
    },
    {
      id: "rew-badge-green",
      reward_name: "Bengaluru Green Commuter Champion Badge",
      description: "Verified profile sustainability badge for choosing low-carbon multi-modal journeys.",
      coin_cost: 20,
      reward_type: "digital_badge",
      stock: null,
      is_active: true,
      created_at: now
    }
  ];

  return {
    profiles: [
      {
        id: commuterId,
        full_name: "Aarav Sharma",
        email: "commuter@omnitransit.in",
        phone: "+91-9845012345",
        password_hash: hashPassword("Commuter@123"),
        role: "commuter",
        preferred_language: "en",
        preferred_currency: "INR",
        timezone: "Asia/Kolkata",
        created_at: now,
        updated_at: now
      },
      {
        id: adminId,
        full_name: "Dr. Kavitha Rao (City Admin)",
        email: "admin@omnitransit.in",
        phone: "+91-9845099999",
        password_hash: hashPassword("Admin@123"),
        role: "city_admin",
        preferred_language: "en",
        preferred_currency: "INR",
        timezone: "Asia/Kolkata",
        created_at: now,
        updated_at: now
      },
      {
        id: opsId,
        full_name: "Vikram Nair (Operations Manager)",
        email: "ops@omnitransit.in",
        phone: "+91-9845088888",
        password_hash: hashPassword("Ops@12345"),
        role: "operations_manager",
        preferred_language: "en",
        preferred_currency: "INR",
        timezone: "Asia/Kolkata",
        created_at: now,
        updated_at: now
      },
      {
        id: safetyOpId,
        full_name: "Inspector Meera Deshmukh (Safety Operator)",
        email: "safety@omnitransit.in",
        phone: "+91-9845077777",
        password_hash: hashPassword("Safety@123"),
        role: "safety_operator",
        preferred_language: "en",
        preferred_currency: "INR",
        timezone: "Asia/Kolkata",
        created_at: now,
        updated_at: now
      }
    ],
    user_preferences: [
      {
        id: "pref-1",
        user_id: commuterId,
        preferred_modes: ["bus", "metro", "walking", "ebike"],
        max_walking_distance: 1500,
        max_budget: 150,
        saferoute_enabled: true,
        weather_alerts_enabled: true,
        eco_notifications_enabled: true,
        accessibility_preferences: { wheelchair_accessible: false },
        created_at: now,
        updated_at: now
      }
    ],
    transit_stops: stops,
    transit_routes: routes,
    fleet_vehicles: fleetVehicles,
    journeys: [],
    journey_segments: [],
    safety_indicators: safetyIndicators,
    flood_zones: floodZones,
    weather_alerts: weatherAlerts,
    emergency_contacts: [
      {
        id: "ec-1",
        user_id: commuterId,
        contact_name: "Priya Sharma",
        phone: "+91-9845054321",
        email: "priya.sharma@example.in",
        relationship: "Spouse",
        is_verified: true,
        notification_preferences: ["in_app", "live_share"],
        created_at: now
      },
      {
        id: "ec-2",
        user_id: commuterId,
        contact_name: "Rajesh Sharma",
        phone: "+91-9845067890",
        email: "rajesh.sharma@example.in",
        relationship: "Parent",
        is_verified: true,
        notification_preferences: ["in_app", "live_share"],
        created_at: now
      }
    ],
    emergency_incidents: [],
    emergency_location_updates: [],
    emission_factors: { ...DEFAULT_EMISSION_FACTORS },
    safety_weights: { ...DEFAULT_SAFETY_WEIGHTS },
    carbon_wallets: [
      {
        id: "wallet-commuter-1",
        user_id: commuterId,
        balance: 65.5,
        lifetime_earned: 65.5,
        lifetime_redeemed: 0,
        lifetime_co2_saved: 4.35,
        updated_at: now
      },
      {
        id: "wallet-admin-1",
        user_id: adminId,
        balance: 0,
        lifetime_earned: 0,
        lifetime_redeemed: 0,
        lifetime_co2_saved: 0,
        updated_at: now
      }
    ],
    carbon_transactions: [
      {
        id: "tx-seed-1",
        wallet_id: "wallet-commuter-1",
        user_id: commuterId,
        transaction_type: "earn",
        amount: 65.5,
        co2_saved: 4.35,
        multiplier: 1.5,
        description: "Initial verified Metro + Bus sustainable commute reward",
        idempotency_key: "seed-initial-tx-001",
        calculation_version: "v1.0-india-ghg",
        created_at: now
      }
    ],
    eco_campaigns: ecoCampaigns,
    rewards: rewards,
    reward_redemptions: [],
    notifications: [
      {
        id: "notif-1",
        user_id: commuterId,
        notification_type: "eco_campaign",
        title: "1.5x Carbon Coins Active on BMTC Route 12",
        message: "Travel during off-peak hours on BMTC Route 12 to earn 50% bonus Carbon Coins.",
        metadata: { campaign_id: "camp-bmtc-offpeak" },
        is_read: false,
        created_at: now
      }
    ],
    audit_logs: [
      {
        id: "audit-seed-1",
        actor_id: adminId,
        actor_email: "admin@omnitransit.in",
        actor_role: "city_admin",
        action: "SYSTEM_SEED_INITIALIZED",
        resource_type: "system",
        metadata: { city: "Bengaluru", currency: "INR", timezone: "Asia/Kolkata" },
        created_at: now
      }
    ],
    journey_shares: [],
    weather_simulation: {
      disruption_active: false,
      rainfall_mm_hr: 4.2,
      wind_speed_kmh: 16,
      temperature_c: 25.4,
      condition_text: "Light Passing Clouds & Pleasant Breeze",
      hazard_level: "LOW",
      affected_corridor: "None",
      updated_at: now
    }
  };
}

class DatabaseRepository {
  private state: DatabaseState;
  private dbFilePath: string;

  constructor() {
    const dataDir = path.resolve(__dirname, "../../data");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbFilePath = path.join(dataDir, "omnitransit-db.json");
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    if (env.NODE_ENV === "test") {
      return createInitialSeedState();
    }
    try {
      if (fs.existsSync(this.dbFilePath)) {
        const raw = fs.readFileSync(this.dbFilePath, "utf-8");
        return JSON.parse(raw) as DatabaseState;
      }
    } catch {
      // Fallback to fresh seed if corrupted
    }
    const seed = createInitialSeedState();
    this.saveState(seed);
    return seed;
  }

  public saveState(customState?: DatabaseState): void {
    const target = customState || this.state;
    if (env.NODE_ENV === "test") return;
    try {
      fs.writeFileSync(this.dbFilePath, JSON.stringify(target, null, 2), "utf-8");
    } catch {
      // Ignore write error in read-only environments
    }
  }

  public resetForTests(): void {
    this.state = createInitialSeedState();
  }

  public getState(): DatabaseState {
    return this.state;
  }

  public addAuditLog(entry: Omit<AuditLogRecord, "id" | "created_at">): AuditLogRecord {
    const record: AuditLogRecord = {
      ...entry,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this.state.audit_logs.unshift(record);
    this.saveState();
    return record;
  }

  public addNotification(entry: Omit<NotificationRecord, "id" | "created_at" | "is_read">): NotificationRecord {
    const record: NotificationRecord = {
      ...entry,
      id: crypto.randomUUID(),
      is_read: false,
      created_at: new Date().toISOString()
    };
    this.state.notifications.unshift(record);
    this.saveState();
    return record;
  }
}

export const db = new DatabaseRepository();
