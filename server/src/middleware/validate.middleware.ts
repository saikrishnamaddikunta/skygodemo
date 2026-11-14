import { NextFunction, Request, Response } from "express";
import { z, ZodError, ZodSchema } from "zod";

const routeParamSchema = z.string().trim().min(1, "Route parameter is required");

/**
 * Safely extracts and validates a single string route parameter from `req.params`,
 * handling Express `@types/express@5` `string | string[] | undefined` typing.
 */
export function getRequiredParam(req: Request, paramName = "id"): string {
  const rawValue = req.params?.[paramName];
  const candidate = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = routeParamSchema.safeParse(candidate);

  if (!parsed.success) {
    const err = new Error(`Invalid or missing route parameter '${paramName}'`) as Error & {
      statusCode?: number;
      code?: string;
    };
    err.statusCode = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  return parsed.data;
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request body",
            details: err.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message
            }))
          }
        });
        return;
      }
      next(err);
    }
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as never;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: err.errors.map((e) => ({
              path: e.path.join("."),
              message: e.message
            }))
          }
        });
        return;
      }
      next(err);
    }
  };
}
