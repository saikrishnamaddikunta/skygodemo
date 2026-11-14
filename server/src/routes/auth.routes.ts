import crypto from "crypto";
import { Router } from "express";
import {
  forgotPasswordSchema,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  userPreferencesSchema
} from "@omnitransit/shared";
import { createSignedToken, requireAuth } from "../middleware/auth.middleware";
import { validateBody } from "../middleware/validate.middleware";
import { db, hashPassword, ProfileRecord, UserPreferencesRecord } from "../repositories/database.repository";
import { carbonService } from "../services/carbon/carbon.service";

const router = Router();

router.post("/register", validateBody(registerSchema), (req, res) => {
  const { fullName, email, password, phone } = req.body;
  const state = db.getState();

  const existing = state.profiles.find(
    (p) => p.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    res.status(409).json({
      success: false,
      error: {
        code: "EMAIL_EXISTS",
        message: "An account with this email already exists",
        details: []
      }
    });
    return;
  }

  const now = new Date().toISOString();
  const userId = crypto.randomUUID();

  // Security: Public registration always provisions 'commuter' role to prevent privilege escalation
  const profile: ProfileRecord = {
    id: userId,
    full_name: fullName,
    email: email.toLowerCase(),
    phone,
    password_hash: hashPassword(password),
    role: "commuter",
    preferred_language: "en",
    preferred_currency: "INR",
    timezone: "Asia/Kolkata",
    created_at: now,
    updated_at: now
  };

  const preferences: UserPreferencesRecord = {
    id: crypto.randomUUID(),
    user_id: userId,
    preferred_modes: ["bus", "metro", "walking", "ebike"],
    max_walking_distance: 1500,
    max_budget: 150,
    saferoute_enabled: true,
    weather_alerts_enabled: true,
    eco_notifications_enabled: true,
    accessibility_preferences: {},
    created_at: now,
    updated_at: now
  };

  state.profiles.push(profile);
  state.user_preferences.push(preferences);
  state.emergency_contacts.push({
    id: crypto.randomUUID(),
    user_id: userId,
    contact_name: "Family Emergency Contact",
    phone: phone || "+91-9845011223",
    relationship: "Family",
    is_verified: true,
    notification_preferences: ["in_app", "live_share"],
    created_at: now
  });
  const wallet = carbonService.getOrCreateWallet(userId);
  db.saveState();

  const token = createSignedToken({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role
  });

  const { password_hash: _ph, ...safeProfile } = profile;

  res.status(201).json({
    success: true,
    data: {
      token,
      user: safeProfile,
      preferences,
      wallet
    },
    message: "Commuter account registered and provisioned successfully"
  });
});

router.post("/login", validateBody(loginSchema), (req, res) => {
  const { email, password } = req.body;
  const state = db.getState();

  const profile = state.profiles.find(
    (p) => p.email.toLowerCase() === email.toLowerCase()
  );

  if (!profile || (profile.password_hash && profile.password_hash !== hashPassword(password))) {
    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_CREDENTIALS",
        message: "Invalid email or password",
        details: []
      }
    });
    return;
  }

  const token = createSignedToken({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role: profile.role
  });

  const preferences = state.user_preferences.find((up) => up.user_id === profile.id);
  const wallet = carbonService.getOrCreateWallet(profile.id);
  const { password_hash: _ph, ...safeProfile } = profile;

  res.json({
    success: true,
    data: {
      token,
      user: safeProfile,
      preferences,
      wallet
    },
    message: "Signed in successfully"
  });
});

router.post("/forgot-password", validateBody(forgotPasswordSchema), (req, res) => {
  const { email } = req.body;
  res.json({
    success: true,
    data: {
      email,
      resetDispatched: true,
      adapterMode: "DEV_FIXTURE"
    },
    message: "If an account exists for this email, password recovery instructions have been dispatched."
  });
});

router.get("/me", requireAuth, (req, res) => {
  const state = db.getState();
  const profile = state.profiles.find((p) => p.id === req.user!.id);
  if (!profile) {
    res.status(404).json({
      success: false,
      error: {
        code: "PROFILE_NOT_FOUND",
        message: "Profile not found",
        details: []
      }
    });
    return;
  }

  let preferences = state.user_preferences.find((up) => up.user_id === profile.id);
  if (!preferences) {
    preferences = {
      id: crypto.randomUUID(),
      user_id: profile.id,
      preferred_modes: ["bus", "metro", "walking"],
      max_walking_distance: 1500,
      max_budget: null,
      saferoute_enabled: false,
      weather_alerts_enabled: true,
      eco_notifications_enabled: true,
      accessibility_preferences: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    state.user_preferences.push(preferences);
    db.saveState();
  }

  const wallet = carbonService.getOrCreateWallet(profile.id);
  const notifications = state.notifications.filter((n) => n.user_id === profile.id);
  const { password_hash: _ph, ...safeProfile } = profile;

  res.json({
    success: true,
    data: {
      user: safeProfile,
      preferences,
      wallet,
      notifications
    },
    message: "Current session profile retrieved"
  });
});

router.post("/profile", requireAuth, validateBody(profileUpdateSchema), (req, res) => {
  const state = db.getState();
  let profile = state.profiles.find((p) => p.id === req.user!.id);
  const now = new Date().toISOString();

  if (!profile) {
    profile = {
      id: req.user!.id,
      full_name: req.body.full_name || req.user!.full_name || "Commuter",
      email: req.user!.email,
      phone: req.body.phone,
      role: "commuter",
      preferred_language: req.body.preferred_language || "en",
      preferred_currency: req.body.preferred_currency || "INR",
      timezone: req.body.timezone || "Asia/Kolkata",
      created_at: now,
      updated_at: now
    };
    state.profiles.push(profile);
  } else {
    if (req.body.full_name) profile.full_name = req.body.full_name;
    if (req.body.phone !== undefined) profile.phone = req.body.phone;
    if (req.body.preferred_language) profile.preferred_language = req.body.preferred_language;
    if (req.body.preferred_currency) profile.preferred_currency = req.body.preferred_currency;
    if (req.body.timezone) profile.timezone = req.body.timezone;
    profile.updated_at = now;
  }

  carbonService.getOrCreateWallet(profile.id);
  db.saveState();

  const { password_hash: _ph, ...safeProfile } = profile;
  res.json({
    success: true,
    data: safeProfile,
    message: "Profile provisioned successfully"
  });
});

router.patch("/profile", requireAuth, validateBody(profileUpdateSchema), (req, res) => {
  const state = db.getState();
  const profile = state.profiles.find((p) => p.id === req.user!.id);
  if (!profile) {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Profile not found",
        details: []
      }
    });
    return;
  }

  if (req.body.full_name !== undefined) profile.full_name = req.body.full_name;
  if (req.body.phone !== undefined) profile.phone = req.body.phone;
  if (req.body.preferred_language !== undefined) {
    profile.preferred_language = req.body.preferred_language;
  }
  if (req.body.preferred_currency !== undefined) {
    profile.preferred_currency = req.body.preferred_currency;
  }
  if (req.body.timezone !== undefined) {
    profile.timezone = req.body.timezone;
  }
  profile.updated_at = new Date().toISOString();
  db.saveState();

  const { password_hash: _ph, ...safeProfile } = profile;
  res.json({
    success: true,
    data: safeProfile,
    message: "Profile updated successfully"
  });
});

router.patch("/preferences", requireAuth, validateBody(userPreferencesSchema), (req, res) => {
  const state = db.getState();
  let pref = state.user_preferences.find((p) => p.user_id === req.user!.id);
  const now = new Date().toISOString();

  if (!pref) {
    pref = {
      id: crypto.randomUUID(),
      user_id: req.user!.id,
      preferred_modes: req.body.preferred_modes || ["bus", "metro", "walking"],
      max_walking_distance: req.body.max_walking_distance || 1500,
      max_budget: req.body.max_budget ?? null,
      saferoute_enabled: req.body.saferoute_enabled ?? false,
      weather_alerts_enabled: req.body.weather_alerts_enabled ?? true,
      eco_notifications_enabled: req.body.eco_notifications_enabled ?? true,
      accessibility_preferences: req.body.accessibility_preferences || {},
      created_at: now,
      updated_at: now
    };
    state.user_preferences.push(pref);
  } else {
    Object.assign(pref, req.body, { updated_at: now });
  }

  db.saveState();
  res.json({
    success: true,
    data: pref,
    message: "User preferences updated successfully"
  });
});

router.patch("/notifications/:id/read", requireAuth, (req, res) => {
  const state = db.getState();
  const notif = state.notifications.find(
    (n) => n.id === req.params.id && n.user_id === req.user!.id
  );
  if (notif) {
    notif.is_read = true;
    db.saveState();
  }
  res.json({
    success: true,
    data: notif || null,
    message: "Notification marked as read"
  });
});

export default router;
