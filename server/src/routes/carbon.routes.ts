import { Router } from "express";
import { carbonCalculationSchema, carbonRedeemSchema } from "@omnitransit/shared";
import { requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { db } from "../repositories/database.repository";
import { carbonService } from "../services/carbon/carbon.service";
import { emitRealtimeEvent } from "../sockets";

const router = Router();

router.get("/wallet", requireAuth, (req, res) => {
  const wallet = carbonService.getOrCreateWallet(req.user!.id);
  const transactions = carbonService.getTransactions(req.user!.id);
  const redemptions = db
    .getState()
    .reward_redemptions.filter((r) => r.user_id === req.user!.id);

  res.json({
    success: true,
    data: {
      wallet,
      transactions,
      redemptions
    },
    message: "Carbon Coins wallet retrieved"
  });
});

router.get("/transactions", requireAuth, (req, res) => {
  const transactions = carbonService.getTransactions(req.user!.id);
  res.json({
    success: true,
    data: transactions,
    message: "Immutable carbon ledger transactions retrieved"
  });
});

router.get("/impact", requireAuth, (req, res) => {
  const impact = carbonService.getUserImpactSummary(req.user!.id);
  res.json({
    success: true,
    data: impact,
    message: "Environmental impact analytics retrieved"
  });
});

/**
 * Server-side Carbon Savings & Coin Preview calculation from trusted DB journey records.
 * Note: Does NOT arbitrarily credit coins; actual coin issuance occurs exclusively
 * upon validated journey completion (`POST /api/v1/journeys/:id/complete`).
 */
router.post("/calculate", requireAuth, validateBody(carbonCalculationSchema), (req, res) => {
  const state = db.getState();
  const journey = state.journeys.find(
    (j) => j.id === req.body.journeyId && j.user_id === req.user!.id
  );

  if (!journey) {
    res.status(404).json({
      success: false,
      error: {
        code: "JOURNEY_NOT_FOUND",
        message: "Trusted journey record not found for carbon calculation",
        details: []
      }
    });
    return;
  }

  const metrics = carbonService.calculateJourneyCarbonMetrics(journey);

  res.json({
    success: true,
    data: metrics,
    message: "Server-side carbon savings and eligible coins calculated from trusted journey record"
  });
});

router.get("/campaigns", (_req, res) => {
  const campaigns = db.getState().eco_campaigns.filter((c) => c.is_active);
  res.json({
    success: true,
    data: campaigns,
    message: "Active eco campaigns retrieved"
  });
});

router.get("/rewards", (_req, res) => {
  const rewards = db.getState().rewards.filter((r) => r.is_active);
  res.json({
    success: true,
    data: rewards,
    message: "Rewards catalog retrieved"
  });
});

router.post("/redeem", requireAuth, validateBody(carbonRedeemSchema), (req, res, next) => {
  try {
    const result = carbonService.redeemReward(
      req.user!.id,
      req.body.rewardId,
      req.body.idempotencyKey
    );

    emitRealtimeEvent("wallet:updated", result, `user:${req.user!.id}`);

    res.status(201).json({
      success: true,
      data: result,
      message: `Redeemed "${result.redemption.reward_name}" (${result.redemption.redemption_code})`
    });
  } catch (err) {
    next(err);
  }
});

export default router;
