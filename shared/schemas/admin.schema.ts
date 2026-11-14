import { z } from "zod";
import { TRANSPORT_MODES, USER_ROLES } from "../constants";

export const adminRouteUpdateSchema = z.object({
  route_name: z.string().min(2).max(120).optional(),
  transport_mode: z.enum(TRANSPORT_MODES).optional(),
  operator_name: z.string().max(120).optional(),
  is_active: z.boolean().optional(),
  underutilized_multiplier: z.number().min(1).max(3).optional()
});

export const adminUserRoleUpdateSchema = z.object({
  role: z.enum(USER_ROLES)
});

export type AdminRouteUpdateInput = z.infer<typeof adminRouteUpdateSchema>;
export type AdminUserRoleUpdateInput = z.infer<typeof adminUserRoleUpdateSchema>;
