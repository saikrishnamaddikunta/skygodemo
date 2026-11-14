import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { aiRouteExplanationResponseSchema } from "@omnitransit/shared";
import { app } from "../app";
import { db } from "../repositories/database.repository";

describe("OmniTransit AI — End-to-End Backend & Minimum Demonstration Scenario Suite", () => {
  beforeEach(() => {
    db.resetForTests();
  });

  it("1. Health check returns operational status, INR currency, and Asia/Kolkata timezone", async () => {
    const res = await request(app).get("/api/v1/health");
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.currency).toBe("INR");
    expect(res.body.data.timezone).toBe("Asia/Kolkata");
  });

  it("2. Executes the complete 14-step Minimum Demonstration Scenario end-to-end", async () => {
    // Step 1: Commuter registers and logs in
    const registerRes = await request(app).post("/api/v1/auth/register").send({
      fullName: "Ananya Verma",
      email: "ananya.verma@omnitransit.in",
      password: "Password@123",
      phone: "+91-9880011223"
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.data.user.role).toBe("commuter");
    expect(registerRes.body.data.wallet.balance).toBe(0);

    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "ananya.verma@omnitransit.in",
      password: "Password@123"
    });
    expect(loginRes.status).toBe(200);
    const commuterToken = loginRes.body.data.token as string;
    expect(commuterToken).toBeTruthy();

    // Step 2 & 3: Commuter enters origin & destination and receives >= 3 multi-modal route alternatives
    const origin = { latitude: 12.9767, longitude: 77.5713 }; // Majestic
    const destination = { latitude: 12.9352, longitude: 77.6245 }; // Koramangala

    const routeRes = await request(app)
      .post("/api/v1/routing/alternatives")
      .set("Authorization", `Bearer ${commuterToken}`)
      .send({
        origin,
        destination,
        originLabel: "Majestic Kempegowda Interchange",
        destinationLabel: "Koramangala Sony World Hub",
        routingPreference: "balanced",
        saferouteEnabled: false
      });

    expect(routeRes.status).toBe(200);
    expect(routeRes.body.data.alternatives.length).toBeGreaterThanOrEqual(3);

    // Step 4 & 5: Commuter activates SafeRoute and evaluates safety indicators & confidence
    const safeEvalRes = await request(app)
      .post("/api/v1/safety/evaluate")
      .set("Authorization", `Bearer ${commuterToken}`)
      .send({
        origin,
        destination,
        preferWellLit: true,
        preferPopulated: true
      });
    expect(safeEvalRes.status).toBe(200);
    expect(safeEvalRes.body.data.overallSafetyScore).toBeGreaterThan(75);
    expect(safeEvalRes.body.data.confidence).toBeGreaterThan(0.7);
    expect(Array.isArray(safeEvalRes.body.data.missingInformation)).toBe(true);

    // Step 6: Weather disruption is introduced through the development fixture
    const weatherSimRes = await request(app)
      .post("/api/v1/weather/refresh")
      .set("Authorization", `Bearer ${commuterToken}`)
      .send({ simulateDisruption: true });
    expect(weatherSimRes.status).toBe(200);
    expect(weatherSimRes.body.data.disruption_active).toBe(true);

    // Step 7 & 8: Routing engine identifies affected segment and generates alternative route
    const recalcRes = await request(app)
      .post("/api/v1/routing/recalculate")
      .set("Authorization", `Bearer ${commuterToken}`)
      .send({
        currentLocation: origin,
        destination,
        routingPreference: "safest",
        saferouteEnabled: true
      });
    expect(recalcRes.status).toBe(200);
    expect(recalcRes.body.data.weatherDisruptionActive).toBe(true);
    expect(recalcRes.body.data.disruptedSegmentsDetected.length).toBeGreaterThan(0);
    expect(recalcRes.body.data.recalculatedRoutes.length).toBeGreaterThanOrEqual(3);

    // Plan and start the recalculated journey
    const planRes = await request(app)
      .post("/api/v1/journeys/plan")
      .set("Authorization", `Bearer ${commuterToken}`)
      .send({
        origin,
        destination,
        originLabel: "Majestic Kempegowda Interchange",
        destinationLabel: "Koramangala Sony World Hub",
        routingPreference: "balanced",
        saferouteEnabled: true,
        preferredModes: ["bus", "metro", "walking", "ebike"],
        selectedRouteId: recalcRes.body.data.recalculatedRoutes[0].id
      });
    expect(planRes.status).toBe(201);
    const journeyId = planRes.body.data.journey.id as string;

    const startRes = await request(app)
      .post(`/api/v1/journeys/${journeyId}/start`)
      .set("Authorization", `Bearer ${commuterToken}`);
    expect(startRes.status).toBe(200);
    expect(startRes.body.data.status).toBe("active");

    // Step 9, 10 & 11: Commuter completes journey -> backend calculates CO2 savings -> Carbon Coins credited
    const completeRes = await request(app)
      .post(`/api/v1/journeys/${journeyId}/complete`)
      .set("Authorization", `Bearer ${commuterToken}`);
    expect(completeRes.status).toBe(200);
    expect(completeRes.body.data.journey.status).toBe("completed");
    expect(completeRes.body.data.reward.metrics.co2SavedKg).toBeGreaterThan(0);
    expect(completeRes.body.data.reward.wallet.balance).toBeGreaterThan(0);

    // Verify duplicate reward prevention (idempotency)
    const balanceAfterFirstComplete = completeRes.body.data.reward.wallet.balance;
    const duplicateCompleteRes = await request(app)
      .post(`/api/v1/journeys/${journeyId}/complete`)
      .set("Authorization", `Bearer ${commuterToken}`);
    expect(duplicateCompleteRes.status).toBe(200);
    expect(duplicateCompleteRes.body.data.reward.alreadyCredited).toBe(true);
    expect(duplicateCompleteRes.body.data.reward.wallet.balance).toBe(balanceAfterFirstComplete);

    // Step 12: Gemini AI / Advisory service generates personalized eco-recommendations
    const ecoAiRes = await request(app)
      .post("/api/v1/ai/eco-recommendations")
      .set("Authorization", `Bearer ${commuterToken}`);
    expect(ecoAiRes.status).toBe(200);
    expect(ecoAiRes.body.data.data.recommendations.length).toBeGreaterThan(0);

    // Step 13 & 14: Administrator logs in and opens city operations dashboard
    const adminLoginRes = await request(app).post("/api/v1/auth/login").send({
      email: "admin@omnitransit.in",
      password: "Admin@123"
    });
    expect(adminLoginRes.status).toBe(200);
    const adminToken = adminLoginRes.body.data.token as string;

    const adminOverviewRes = await request(app)
      .get("/api/v1/admin/overview")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(adminOverviewRes.status).toBe(200);
    expect(adminOverviewRes.body.data.kpis.completedJourneys).toBeGreaterThanOrEqual(1);
    expect(adminOverviewRes.body.data.kpis.totalCo2SavedKg).toBeGreaterThan(0);
  });

  it("3. Enforces strict Role-Based Authorization and prevents commuter access to admin endpoints", async () => {
    const loginRes = await request(app).post("/api/v1/auth/login").send({
      email: "commuter@omnitransit.in",
      password: "Commuter@123"
    });
    const commuterToken = loginRes.body.data.token as string;

    const forbiddenAdminRes = await request(app)
      .get("/api/v1/admin/overview")
      .set("Authorization", `Bearer ${commuterToken}`);
    expect(forbiddenAdminRes.status).toBe(403);
    expect(forbiddenAdminRes.body.error.code).toBe("FORBIDDEN");
  });

  it("4. Validates Emergency SOS creation, location updates, cancellation, and unauthorized access prevention", async () => {
    const commuterLogin = await request(app).post("/api/v1/auth/login").send({
      email: "commuter@omnitransit.in",
      password: "Commuter@123"
    });
    const commuterToken = commuterLogin.body.data.token as string;

    const sosRes = await request(app)
      .post("/api/v1/emergency/sos")
      .set("Authorization", `Bearer ${commuterToken}`)
      .send({
        latitude: 12.9756,
        longitude: 77.6068,
        message: "Test SOS trigger near MG Road"
      });
    expect(sosRes.status).toBe(201);
    const incidentId = sosRes.body.data.id as string;
    expect(sosRes.body.data.notification_status.official_112_notice).toContain("112");

    // Push live location update
    const locUpdateRes = await request(app)
      .post(`/api/v1/emergency/${incidentId}/location`)
      .set("Authorization", `Bearer ${commuterToken}`)
      .send({
        latitude: 12.9760,
        longitude: 77.6075,
        accuracyMeters: 10
      });
    expect(locUpdateRes.status).toBe(200);

    // Another commuter cannot access this emergency incident
    const otherCommuterReg = await request(app).post("/api/v1/auth/register").send({
      fullName: "Other User",
      email: "other@omnitransit.in",
      password: "Password@123"
    });
    const otherToken = otherCommuterReg.body.data.token as string;

    const unauthorizedIncidentGet = await request(app)
      .get(`/api/v1/emergency/${incidentId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(unauthorizedIncidentGet.status).toBe(403);

    // Owner can cancel accidental SOS
    const cancelRes = await request(app)
      .post(`/api/v1/emergency/${incidentId}/cancel`)
      .set("Authorization", `Bearer ${commuterToken}`)
      .send({ reason: "Accidental test activation" });
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.data.status).toBe("cancelled");
  });

  it("5. Validates Carbon Coin reward redemption and rejects invalid AI output via Zod", async () => {
    const commuterLogin = await request(app).post("/api/v1/auth/login").send({
      email: "commuter@omnitransit.in",
      password: "Commuter@123"
    });
    const commuterToken = commuterLogin.body.data.token as string;

    // Seeded commuter has 65.5 coins; redeem a 20-coin badge
    const redeemRes = await request(app)
      .post("/api/v1/carbon/redeem")
      .set("Authorization", `Bearer ${commuterToken}`)
      .send({
        rewardId: "rew-badge-green",
        idempotencyKey: "test-redeem-key-001"
      });
    expect(redeemRes.status).toBe(201);
    expect(redeemRes.body.data.wallet.balance).toBe(45.5);
    expect(redeemRes.body.data.redemption.redemption_code).toMatch(/^OMNI-/);

    // Reject invalid AI schema confidence (> 1)
    const invalidAiPayload = {
      recommended_route_id: "route_1",
      summary: "Test",
      reasoning: ["Reason"],
      warnings: [],
      tradeoffs: [],
      confidence: 1.5
    };
    const parseResult = aiRouteExplanationResponseSchema.safeParse(invalidAiPayload);
    expect(parseResult.success).toBe(false);
  });
});
