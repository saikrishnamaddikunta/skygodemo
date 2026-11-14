import crypto from "crypto";
import { env } from "../../config/env";
import {
  CarbonTransactionRecord,
  CarbonWalletRecord,
  db,
  JourneyRecord,
  RewardRedemptionRecord
} from "../../repositories/database.repository";

export interface JourneyCarbonMetrics {
  journeyId: string;
  totalDistanceKm: number;
  baselineEmissionsKg: number;
  actualEmissionsKg: number;
  co2SavedKg: number;
  baseRewardRate: number;
  dynamicMultiplier: number;
  appliedCampaignName: string;
  eligibleCarbonCoins: number;
  calculationVersion: string;
}

export const carbonService = {
  getOrCreateWallet(userId: string): CarbonWalletRecord {
    const state = db.getState();
    let wallet = state.carbon_wallets.find((w) => w.user_id === userId);
    if (!wallet) {
      wallet = {
        id: `wallet-${crypto.randomUUID().slice(0, 8)}`,
        user_id: userId,
        balance: 0,
        lifetime_earned: 0,
        lifetime_redeemed: 0,
        lifetime_co2_saved: 0,
        updated_at: new Date().toISOString()
      };
      state.carbon_wallets.push(wallet);
      db.saveState();
    }
    return wallet;
  },

  getTransactions(userId: string): CarbonTransactionRecord[] {
    const wallet = this.getOrCreateWallet(userId);
    return db
      .getState()
      .carbon_transactions.filter((t) => t.wallet_id === wallet.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  /**
   * Computes emissions, CO2 savings, and dynamic campaign multipliers from trusted database records.
   * Formula:
   *   CO2 Saved = max(0, Baseline Emissions - Actual Journey Emissions)
   *   Carbon Coins = round(CO2 Saved * Base Reward Rate * Dynamic Route Multiplier, 2)
   */
  calculateJourneyCarbonMetrics(journey: JourneyRecord): JourneyCarbonMetrics {
    const state = db.getState();
    const segments = state.journey_segments.filter((s) => s.journey_id === journey.id);

    const baselineFactor = state.emission_factors.petrol_car ?? 0.192;
    const totalDistKm =
      segments.length > 0
        ? segments.reduce((sum, s) => sum + s.distance_km, 0)
        : journey.estimated_distance;

    const baselineEmissions = Number((totalDistKm * baselineFactor).toFixed(4));
    const actualEmissions =
      segments.length > 0
        ? Number(segments.reduce((sum, s) => sum + s.co2_emissions, 0).toFixed(4))
        : Number(journey.estimated_co2.toFixed(4));

    const co2Saved = Number(Math.max(0, baselineEmissions - actualEmissions).toFixed(4));

    // Determine highest applicable active campaign multiplier
    const modesUsed = new Set(segments.map((s) => s.transport_mode));
    let activeMultiplier = 1.0;
    let appliedCampaignName = "Standard Sustainable Commute Rate";

    const nowMs = Date.now();
    for (const camp of state.eco_campaigns) {
      if (!camp.is_active) continue;
      const startMs = new Date(camp.start_time).getTime();
      const endMs = new Date(camp.end_time).getTime();
      if (nowMs >= startMs && nowMs <= endMs) {
        const matchesMode = camp.eligible_modes.some((m) => modesUsed.has(m as never));
        if (matchesMode && camp.multiplier > activeMultiplier) {
          activeMultiplier = camp.multiplier;
          appliedCampaignName = camp.campaign_name;
        }
      }
    }

    if (activeMultiplier === 1.0 && (modesUsed.has("bus") || modesUsed.has("metro"))) {
      activeMultiplier = 1.5;
      appliedCampaignName = "Public Transit Utilization Multiplier";
    }

    const baseRate = env.BASE_CARBON_REWARD_RATE;
    const rawCoins = co2Saved > 0 ? co2Saved * baseRate * activeMultiplier : 0;
    const carbonCoins = Number(rawCoins.toFixed(2));

    return {
      journeyId: journey.id,
      totalDistanceKm: Number(totalDistKm.toFixed(2)),
      baselineEmissionsKg: baselineEmissions,
      actualEmissionsKg: actualEmissions,
      co2SavedKg: co2Saved,
      baseRewardRate: baseRate,
      dynamicMultiplier: activeMultiplier,
      appliedCampaignName,
      eligibleCarbonCoins: carbonCoins,
      calculationVersion: "v1.0-india-ghg"
    };
  },

  /**
   * Issues Carbon Coins into the immutable ledger upon validated journey completion.
   * Enforces idempotency, ownership, and daily reward caps.
   */
  creditJourneyCompletionReward(userId: string, journeyId: string): {
    wallet: CarbonWalletRecord;
    transaction: CarbonTransactionRecord | null;
    metrics: JourneyCarbonMetrics;
    alreadyCredited: boolean;
  } {
    const state = db.getState();
    const journey = state.journeys.find((j) => j.id === journeyId && j.user_id === userId);
    if (!journey) {
      throw new Error("Journey not found or unauthorized");
    }

    const idempotencyKey = `journey-reward-${journey.id}`;
    const existingTx = state.carbon_transactions.find(
      (t) => t.idempotency_key === idempotencyKey
    );

    const wallet = this.getOrCreateWallet(userId);
    const metrics = this.calculateJourneyCarbonMetrics(journey);

    if (existingTx) {
      return {
        wallet,
        transaction: existingTx,
        metrics,
        alreadyCredited: true
      };
    }

    // Check daily cap
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const earnedToday = state.carbon_transactions
      .filter(
        (t) =>
          t.wallet_id === wallet.id &&
          t.transaction_type === "earn" &&
          new Date(t.created_at) >= startOfToday
      )
      .reduce((sum, t) => sum + t.amount, 0);

    const remainingDailyCap = Math.max(0, env.MAX_DAILY_CARBON_REWARDS - earnedToday);
    const finalCoins = Number(Math.min(metrics.eligibleCarbonCoins, remainingDailyCap).toFixed(2));

    let txRecord: CarbonTransactionRecord | null = null;
    if (finalCoins > 0 && metrics.co2SavedKg > 0) {
      txRecord = {
        id: crypto.randomUUID(),
        wallet_id: wallet.id,
        user_id: userId,
        journey_id: journey.id,
        transaction_type: "earn",
        amount: finalCoins,
        co2_saved: metrics.co2SavedKg,
        multiplier: metrics.dynamicMultiplier,
        description: `Completed multi-modal journey (${journey.origin_label} -> ${journey.destination_label}) • ${metrics.appliedCampaignName}`,
        idempotency_key: idempotencyKey,
        calculation_version: metrics.calculationVersion,
        created_at: new Date().toISOString()
      };

      state.carbon_transactions.unshift(txRecord);
      wallet.balance = Number((wallet.balance + finalCoins).toFixed(2));
      wallet.lifetime_earned = Number((wallet.lifetime_earned + finalCoins).toFixed(2));
      wallet.lifetime_co2_saved = Number((wallet.lifetime_co2_saved + metrics.co2SavedKg).toFixed(4));
      wallet.updated_at = new Date().toISOString();

      db.addNotification({
        user_id: userId,
        notification_type: "carbon_reward",
        title: `+${finalCoins} Carbon Coins Earned!`,
        message: `You saved ${metrics.co2SavedKg} kg CO2e on your journey (${metrics.dynamicMultiplier}x multiplier).`,
        metadata: { journey_id: journey.id, coins: finalCoins, co2_saved: metrics.co2SavedKg }
      });
    }

    db.saveState();
    return {
      wallet,
      transaction: txRecord,
      metrics,
      alreadyCredited: false
    };
  },

  redeemReward(userId: string, rewardId: string, customIdempotencyKey?: string): {
    redemption: RewardRedemptionRecord;
    wallet: CarbonWalletRecord;
    transaction: CarbonTransactionRecord;
  } {
    const state = db.getState();
    const reward = state.rewards.find((r) => r.id === rewardId && r.is_active);
    if (!reward) {
      throw new Error("Selected reward is unavailable or inactive");
    }

    if (reward.stock !== null && reward.stock <= 0) {
      throw new Error("Reward is currently out of stock");
    }

    const wallet = this.getOrCreateWallet(userId);
    if (wallet.balance < reward.coin_cost) {
      throw new Error(
        `Insufficient Carbon Coins. Required: ${reward.coin_cost}, Available: ${wallet.balance}`
      );
    }

    const idempotencyKey =
      customIdempotencyKey || `redeem-${userId}-${rewardId}-${Date.now()}`;
    const duplicate = state.carbon_transactions.find(
      (t) => t.idempotency_key === idempotencyKey
    );
    if (duplicate) {
      throw new Error("Duplicate redemption request detected");
    }

    // Atomic deduction
    wallet.balance = Number((wallet.balance - reward.coin_cost).toFixed(2));
    wallet.lifetime_redeemed = Number((wallet.lifetime_redeemed + reward.coin_cost).toFixed(2));
    wallet.updated_at = new Date().toISOString();

    if (reward.stock !== null) {
      reward.stock -= 1;
    }

    const txRecord: CarbonTransactionRecord = {
      id: crypto.randomUUID(),
      wallet_id: wallet.id,
      user_id: userId,
      transaction_type: "redeem",
      amount: reward.coin_cost,
      co2_saved: 0,
      multiplier: 1,
      description: `Redeemed reward: ${reward.reward_name} (Demo Voucher)`,
      idempotency_key: idempotencyKey,
      calculation_version: "v1.0-ledger",
      created_at: new Date().toISOString()
    };
    state.carbon_transactions.unshift(txRecord);

    const redemptionRecord: RewardRedemptionRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      reward_id: reward.id,
      reward_name: reward.reward_name,
      coins_spent: reward.coin_cost,
      redemption_code: `OMNI-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
      status: "issued_demo_voucher",
      created_at: new Date().toISOString()
    };
    state.reward_redemptions.unshift(redemptionRecord);

    db.saveState();
    return {
      redemption: redemptionRecord,
      wallet,
      transaction: txRecord
    };
  },

  getUserImpactSummary(userId: string) {
    const state = db.getState();
    const wallet = this.getOrCreateWallet(userId);
    const completedJourneys = state.journeys.filter(
      (j) => j.user_id === userId && j.status === "completed"
    );
    const redemptions = state.reward_redemptions.filter((r) => r.user_id === userId);

    const modeBreakdown: Record<string, number> = {
      metro: 0,
      bus: 0,
      walking: 0,
      ebike: 0,
      cycling: 0
    };

    for (const j of completedJourneys) {
      const segs = state.journey_segments.filter((s) => s.journey_id === j.id);
      for (const s of segs) {
        modeBreakdown[s.transport_mode] =
          Number(((modeBreakdown[s.transport_mode] || 0) + s.distance_km).toFixed(2));
      }
    }

    const equivalentTreesMonthly = Number((wallet.lifetime_co2_saved / 1.8).toFixed(1));

    return {
      wallet,
      completedJourneysCount: completedJourneys.length,
      totalCo2SavedKg: wallet.lifetime_co2_saved,
      equivalentTreesMonthly,
      modeDistanceKm: modeBreakdown,
      redemptions,
      emissionFactors: state.emission_factors
    };
  }
};
