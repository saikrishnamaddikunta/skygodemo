import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { UserRole } from "@omnitransit/shared";
import { env } from "../config/env";
import { getSupabaseAdmin } from "../config/supabase";
import { db, ProfileRecord } from "../repositories/database.repository";

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export function createSignedToken(user: AuthenticatedUser): string {
  const payload = {
    sub: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + 7 * 86400
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifySignedToken(token: string): AuthenticatedUser | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    const expectedSig = crypto
      .createHmac("sha256", env.JWT_SECRET)
      .update(encoded)
      .digest("base64url");
    if (sig !== expectedSig) return null;
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    const profile: ProfileRecord | undefined = db
      .getState()
      .profiles.find((p) => p.id === payload.sub);
    return {
      id: payload.sub,
      email: profile?.email || payload.email,
      full_name: profile?.full_name || payload.full_name,
      role: profile?.role || payload.role
    };
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication token is required",
        details: []
      }
    });
    return;
  }

  const token = authHeader.slice(7).trim();

  // 1. Check signed OmniTransit token
  const localUser = verifySignedToken(token);
  if (localUser) {
    req.user = localUser;
    next();
    return;
  }

  // 2. If Supabase Admin is configured, verify Supabase JWT
  const supabase = getSupabaseAdmin();
  if (supabase) {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        const profile = db.getState().profiles.find((p) => p.id === data.user.id);
        req.user = {
          id: data.user.id,
          email: data.user.email || "",
          full_name:
            profile?.full_name ||
            (data.user.user_metadata?.full_name as string) ||
            "Commuter",
          role: profile?.role || "commuter"
        };
        next();
        return;
      }
    } catch {
      // Fall through to 401
    }
  }

  res.status(401).json({
    success: false,
    error: {
      code: "INVALID_TOKEN",
      message: "Invalid or expired authentication session",
      details: []
    }
  });
}
