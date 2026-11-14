import { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger";

export function errorHandler(
  err: Error & { statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  const statusCode = err.statusCode || 400;
  logger.error("API error caught", {
    message: err.message,
    statusCode
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || (statusCode === 403 ? "FORBIDDEN" : "OPERATION_FAILED"),
      message: err.message || "An unexpected error occurred",
      details: []
    }
  });
}
