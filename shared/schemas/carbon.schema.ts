import { z } from "zod";

export const carbonCalculationSchema = z.object({
  journeyId: z.string().min(1),
  baselineMode: z.string().default("petrol_car"),
  actualEmissions: z.number().nonnegative().optional(),
  baselineEmissions: z.number().nonnegative().optional()
});

export const carbonRedeemSchema = z.object({
  rewardId: z.string().min(1),
  idempotencyKey: z.string().min(6).max(120).optional()
});

export const ecoCampaignCreateSchema = z.object({
  campaign_name: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  multiplier: z.number().min(1).max(5),
  eligible_routes: z.array(z.string()).default([]),
  eligible_modes: z.array(z.string()).min(1),
  start_time: z.string(),
  end_time: z.string(),
  daily_reward_limit: z.number().positive().default(500),
  is_active: z.boolean().default(true)
});

export type CarbonCalculationInput = z.infer<typeof carbonCalculationSchema>;
export type CarbonRedeemInput = z.infer<typeof carbonRedeemSchema>;
export type EcoCampaignCreateInput = z.infer<typeof ecoCampaignCreateSchema>;
