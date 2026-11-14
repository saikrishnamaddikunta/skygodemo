import { NextFunction, Request, Response } from "express";
import { UserRole } from "@omnitransit/shared";

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Authentication required",
          details: []
        }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Insufficient permissions. Required role(s): ${allowedRoles.join(", ")}`,
          details: []
        }
      });
      return;
    }

    next();
  };
}
