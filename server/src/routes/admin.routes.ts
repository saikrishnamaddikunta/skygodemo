import crypto from "crypto";
import { Router } from "express";
import {
  adminRouteUpdateSchema,
  adminUserRoleUpdateSchema,
  ecoCampaignCreateSchema,
  floodZoneCreateSchema,
  safetyWeightsSchema
} from "@omnitransit/shared";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRoles } from "../middleware/role.middleware";
import { getRequiredParam, validateBody } from "../middleware/validate.middleware";
import { db, EcoCampaignRecord } from "../repositories/database.repository";
import { aiUsageStats } from "../services/ai/gemini.client";
import { weatherService } from "../services/weather/weather.service";

const router = Router();

// All /admin routes require authenticated administrative role
const ALL_ADMIN_ROLES = ["city_admin", "operations_manager", "safety_operator"] as const;

router.get("/overview", requireAuth, requireRoles(...ALL_ADMIN_ROLES), (_req, res) => {
  const state = db.getState();

  const totalCommuters = state.profiles.filter((p) => p.role === "commuter").length;
  const activeFleetCount = state.fleet_vehicles.filter((v) => v.status === "active").length;
  const activeIncidentsCount = state.emergency_incidents.filter(
    (i) => i.status === "active" || i.status === "acknowledged"
  ).length;
  const totalCo2SavedKg = Number(
    state.carbon_wallets.reduce((sum, w) => sum + w.lifetime_co2_saved, 0).toFixed(2)
  );
  const totalCoinsDistributed = Number(
    state.carbon_wallets.reduce((sum, w) => sum + w.lifetime_earned, 0).toFixed(2)
  );

  const underutilizedRoutes = state.transit_routes.filter((r) => r.utilization_pct < 50);

  res.json({
    success: true,
    data: {
      kpis: {
        totalUsers: state.profiles.length,
        totalCommuters,
        totalJourneys: state.journeys.length,
        completedJourneys: state.journeys.filter((j) => j.status === "completed").length,
        activeFleetCount,
        totalRoutes: state.transit_routes.length,
        underutilizedRoutesCount: underutilizedRoutes.length,
        activeIncidentsCount,
        activeFloodZonesCount: state.flood_zones.filter((f) => f.is_active).length,
        totalCo2SavedKg,
        totalCoinsDistributed
      },
      weatherStatus: state.weather_simulation,
      underutilizedRoutes,
      recentIncidents: state.emergency_incidents.slice(0, 5),
      recentAuditLogs: state.audit_logs.slice(0, 8),
      aiTelemetry: aiUsageStats
    },
    message: "City operations overview retrieved"
  });
});

router.get(
  "/fleet",
  requireAuth,
  requireRoles("city_admin", "operations_manager"),
  (_req, res) => {
    const state = db.getState();
    res.json({
      success: true,
      data: {
        vehicles: state.fleet_vehicles,
        stops: state.transit_stops,
        routes: state.transit_routes
      },
      message: "Fleet vehicles and transit network retrieved"
    });
  }
);

router.get(
  "/fleet/:id",
  requireAuth,
  requireRoles("city_admin", "operations_manager"),
  (req, res) => {
    const vehicle = db.getState().fleet_vehicles.find((v) => v.id === req.params.id);
    if (!vehicle) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Fleet vehicle not found", details: [] }
      });
      return;
    }
    res.json({
      success: true,
      data: vehicle,
      message: "Fleet vehicle details retrieved"
    });
  }
);

router.get(
  "/routes",
  requireAuth,
  requireRoles("city_admin", "operations_manager"),
  (_req, res) => {
    res.json({
      success: true,
      data: db.getState().transit_routes,
      message: "Transit routes retrieved"
    });
  }
);

router.patch(
  "/routes/:id",
  requireAuth,
  requireRoles("city_admin", "operations_manager"),
  validateBody(adminRouteUpdateSchema),
  (req, res) => {
    const state = db.getState();
    const route = state.transit_routes.find((r) => r.id === req.params.id);
    if (!route) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Transit route not found", details: [] }
      });
      return;
    }

    Object.assign(route, req.body);
    db.addAuditLog({
      actor_id: req.user!.id,
      actor_email: req.user!.email,
      actor_role: req.user!.role,
      action: "TRANSIT_ROUTE_UPDATED",
      resource_type: "transit_route",
      resource_id: route.id,
      metadata: req.body
    });
    db.saveState();

    res.json({
      success: true,
      data: route,
      message: "Transit route updated"
    });
  }
);

router.post(
  "/flood-zones",
  requireAuth,
  requireRoles("city_admin", "operations_manager"),
  validateBody(floodZoneCreateSchema),
  (req, res) => {
    const zone = weatherService.createFloodZone(req.user!.id, req.body);
    db.addAuditLog({
      actor_id: req.user!.id,
      actor_email: req.user!.email,
      actor_role: req.user!.role,
      action: "FLOOD_ZONE_CREATED",
      resource_type: "flood_zone",
      resource_id: zone.id,
      metadata: { zone_name: zone.zone_name, risk_level: zone.risk_level }
    });

    res.status(201).json({
      success: true,
      data: zone,
      message: "Flood-risk zone added and verified"
    });
  }
);

router.patch(
  "/flood-zones/:id",
  requireAuth,
  requireRoles("city_admin", "operations_manager"),
  (req, res, next) => {
    try {
      const zoneId = getRequiredParam(req, "id");
      const updated = weatherService.updateFloodZone(zoneId, req.body);
      db.addAuditLog({
        actor_id: req.user!.id,
        actor_email: req.user!.email,
        actor_role: req.user!.role,
        action: "FLOOD_ZONE_UPDATED",
        resource_type: "flood_zone",
        resource_id: updated.id,
        metadata: req.body
      });
      res.json({
        success: true,
        data: updated,
        message: "Flood-risk zone updated"
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  "/flood-zones/:id",
  requireAuth,
  requireRoles("city_admin", "operations_manager"),
  (req, res, next) => {
    try {
      const zoneId = getRequiredParam(req, "id");
      weatherService.deleteFloodZone(zoneId);
      db.addAuditLog({
        actor_id: req.user!.id,
        actor_email: req.user!.email,
        actor_role: req.user!.role,
        action: "FLOOD_ZONE_DELETED",
        resource_type: "flood_zone",
        resource_id: zoneId,
        metadata: {}
      });
      res.json({
        success: true,
        data: { id: zoneId },
        message: "Flood-risk zone removed"
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  "/safety/heatmap",
  requireAuth,
  requireRoles("city_admin", "safety_operator"),
  (_req, res) => {
    const state = db.getState();
    res.json({
      success: true,
      data: {
        weights: state.safety_weights,
        indicators: state.safety_indicators,
        hubScores: state.transit_stops.map((s) => ({
          id: s.id,
          name: s.name,
          location: s.location,
          lightingScore: s.lighting_score,
          populationScore: s.population_score,
          incidentSafetyScore: s.incident_safety_score,
          emergencyInfraScore: s.emergency_infra_score,
          cctvVerified: s.cctv_verified
        }))
      },
      message: "Safety heatmap and configurable weights retrieved"
    });
  }
);

router.patch(
  "/safety/weights",
  requireAuth,
  requireRoles("city_admin", "safety_operator"),
  validateBody(safetyWeightsSchema),
  (req, res) => {
    const state = db.getState();
    state.safety_weights = req.body;
    db.addAuditLog({
      actor_id: req.user!.id,
      actor_email: req.user!.email,
      actor_role: req.user!.role,
      action: "SAFETY_WEIGHTS_UPDATED",
      resource_type: "safety_weights",
      metadata: req.body
    });
    db.saveState();

    res.json({
      success: true,
      data: state.safety_weights,
      message: "SafeRoute scoring weights updated"
    });
  }
);

router.get(
  "/incidents",
  requireAuth,
  requireRoles("city_admin", "safety_operator"),
  (_req, res) => {
    const state = db.getState();
    res.json({
      success: true,
      data: state.emergency_incidents,
      message: "Emergency incidents retrieved"
    });
  }
);

router.get(
  "/carbon/analytics",
  requireAuth,
  requireRoles("city_admin", "operations_manager"),
  (_req, res) => {
    const state = db.getState();
    const totalCo2SavedKg = Number(
      state.carbon_wallets.reduce((sum, w) => sum + w.lifetime_co2_saved, 0).toFixed(2)
    );
    const totalCoinsEarned = Number(
      state.carbon_wallets.reduce((sum, w) => sum + w.lifetime_earned, 0).toFixed(2)
    );
    const totalCoinsRedeemed = Number(
      state.carbon_wallets.reduce((sum, w) => sum + w.lifetime_redeemed, 0).toFixed(2)
    );

    const modeSplit = [
      { mode: "Metro", sharePct: 44, co2Factor: state.emission_factors.metro },
      { mode: "Public Bus", sharePct: 32, co2Factor: state.emission_factors.bus },
      { mode: "E-Bike", sharePct: 14, co2Factor: state.emission_factors.ebike },
      { mode: "Walking", sharePct: 10, co2Factor: 0 }
    ];

    res.json({
      success: true,
      data: {
        totalCo2SavedKg,
        totalCoinsEarned,
        totalCoinsRedeemed,
        activeWalletsCount: state.carbon_wallets.length,
        emissionFactors: state.emission_factors,
        modeSplit,
        recentTransactions: state.carbon_transactions.slice(0, 15)
      },
      message: "City-wide carbon and sustainability analytics retrieved"
    });
  }
);

router.get("/campaigns", requireAuth, requireRoles(...ALL_ADMIN_ROLES), (_req, res) => {
  res.json({
    success: true,
    data: db.getState().eco_campaigns,
    message: "Eco campaigns retrieved"
  });
});

router.post(
  "/campaigns",
  requireAuth,
  requireRoles("city_admin"),
  validateBody(ecoCampaignCreateSchema),
  (req, res) => {
    const state = db.getState();
    const campaign: EcoCampaignRecord = {
      id: `camp-${crypto.randomUUID().slice(0, 8)}`,
      campaign_name: req.body.campaign_name,
      description: req.body.description || "",
      multiplier: req.body.multiplier,
      eligible_routes: req.body.eligible_routes || [],
      eligible_modes: req.body.eligible_modes,
      start_time: req.body.start_time,
      end_time: req.body.end_time,
      daily_reward_limit: req.body.daily_reward_limit || 500,
      is_active: req.body.is_active ?? true,
      created_by: req.user!.id,
      created_at: new Date().toISOString()
    };

    state.eco_campaigns.unshift(campaign);
    db.addAuditLog({
      actor_id: req.user!.id,
      actor_email: req.user!.email,
      actor_role: req.user!.role,
      action: "ECO_CAMPAIGN_CREATED",
      resource_type: "eco_campaign",
      resource_id: campaign.id,
      metadata: { campaign_name: campaign.campaign_name, multiplier: campaign.multiplier }
    });
    db.saveState();

    res.status(201).json({
      success: true,
      data: campaign,
      message: "Eco campaign created"
    });
  }
);

router.patch(
  "/campaigns/:id",
  requireAuth,
  requireRoles("city_admin"),
  (req, res) => {
    const state = db.getState();
    const campaign = state.eco_campaigns.find((c) => c.id === req.params.id);
    if (!campaign) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Campaign not found", details: [] }
      });
      return;
    }

    if (req.body.campaign_name !== undefined) campaign.campaign_name = req.body.campaign_name;
    if (req.body.description !== undefined) campaign.description = req.body.description;
    if (req.body.multiplier !== undefined) campaign.multiplier = Number(req.body.multiplier);
    if (req.body.is_active !== undefined) campaign.is_active = Boolean(req.body.is_active);
    if (req.body.daily_reward_limit !== undefined) {
      campaign.daily_reward_limit = Number(req.body.daily_reward_limit);
    }

    db.addAuditLog({
      actor_id: req.user!.id,
      actor_email: req.user!.email,
      actor_role: req.user!.role,
      action: "ECO_CAMPAIGN_UPDATED",
      resource_type: "eco_campaign",
      resource_id: campaign.id,
      metadata: req.body
    });
    db.saveState();

    res.json({
      success: true,
      data: campaign,
      message: "Eco campaign updated"
    });
  }
);

router.delete(
  "/campaigns/:id",
  requireAuth,
  requireRoles("city_admin"),
  (req, res, next) => {
    try {
      const campaignId = getRequiredParam(req, "id");
      const state = db.getState();
      const idx = state.eco_campaigns.findIndex((c) => c.id === campaignId);
      if (idx === -1) {
        res.status(404).json({
          success: false,
          error: { code: "NOT_FOUND", message: "Campaign not found", details: [] }
        });
        return;
      }

      state.eco_campaigns.splice(idx, 1);
      db.addAuditLog({
        actor_id: req.user!.id,
        actor_email: req.user!.email,
        actor_role: req.user!.role,
        action: "ECO_CAMPAIGN_DELETED",
        resource_type: "eco_campaign",
        resource_id: campaignId,
        metadata: {}
      });
      db.saveState();

      res.json({
        success: true,
        data: { id: campaignId },
        message: "Eco campaign deleted"
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get("/users", requireAuth, requireRoles("city_admin"), (_req, res) => {
  const users = db.getState().profiles.map(({ password_hash: _ph, ...rest }) => rest);
  res.json({
    success: true,
    data: users,
    message: "Registered users retrieved"
  });
});

router.patch(
  "/users/:id/role",
  requireAuth,
  requireRoles("city_admin"),
  validateBody(adminUserRoleUpdateSchema),
  (req, res) => {
    const state = db.getState();
    const user = state.profiles.find((p) => p.id === req.params.id);
    if (!user) {
      res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "User not found", details: [] }
      });
      return;
    }

    user.role = req.body.role;
    user.updated_at = new Date().toISOString();
    db.addAuditLog({
      actor_id: req.user!.id,
      actor_email: req.user!.email,
      actor_role: req.user!.role,
      action: "USER_ROLE_UPDATED",
      resource_type: "profile",
      resource_id: user.id,
      metadata: { newRole: req.body.role }
    });
    db.saveState();

    const { password_hash: _ph, ...safeUser } = user;
    res.json({
      success: true,
      data: safeUser,
      message: "User role updated"
    });
  }
);

router.get("/audit-logs", requireAuth, requireRoles("city_admin"), (_req, res) => {
  res.json({
    success: true,
    data: db.getState().audit_logs,
    message: "Administrative audit logs retrieved"
  });
});

export default router;
