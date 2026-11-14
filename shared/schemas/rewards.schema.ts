import { z } from "zod";

export const rewardSchema = z.object({
  reward_name: z.string().min(3).max(120),
  description: z.string().max(500).optional(),
  coin_cost: z.number().positive(),
  reward_type: z.enum(["transit_discount", "partner_coupon", "mobility_voucher", "digital_badge", "achievement"]),
  stock: z.number().int().nonnegative().nullable().optional(),
  is_active: z.boolean().default(true)
});

export type RewardInput = z.infer<typeof rewardSchema>;
