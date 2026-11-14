import { Router } from "express";
import {
  emergencyContactSchema,
  emergencyContactUpdateSchema,
  emergencyLocationUpdateSchema,
  sosSchema
} from "@omnitransit/shared";
import { requireAuth } from "../middleware/auth.middleware";
import { getRequiredParam, validateBody } from "../middleware/validate.middleware";
import { emergencyService } from "../services/emergency/emergency.service";
import { emitRealtimeEvent } from "../sockets";

const router = Router();

// Trusted Contacts Routes (placed before /:id parameter route)
router.get("/contacts", requireAuth, (req, res) => {
  const contacts = emergencyService.getContacts(req.user!.id);
  res.json({
    success: true,
    data: contacts,
    message: "Trusted emergency contacts retrieved"
  });
});

router.post("/contacts", requireAuth, validateBody(emergencyContactSchema), (req, res) => {
  const contact = emergencyService.addContact(req.user!.id, req.body);
  res.status(201).json({
    success: true,
    data: contact,
    message: "Trusted emergency contact added"
  });
});

router.patch(
  "/contacts/:id",
  requireAuth,
  validateBody(emergencyContactUpdateSchema),
  (req, res, next) => {
    try {
      const contactId = getRequiredParam(req, "id");
      const updated = emergencyService.updateContact(req.user!.id, contactId, req.body);
      res.json({
        success: true,
        data: updated,
        message: "Trusted emergency contact updated"
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete("/contacts/:id", requireAuth, (req, res, next) => {
  try {
    const contactId = getRequiredParam(req, "id");
    emergencyService.deleteContact(req.user!.id, contactId);
    res.json({
      success: true,
      data: { id: contactId },
      message: "Trusted emergency contact deleted"
    });
  } catch (err) {
    next(err);
  }
});

// SOS Incident Routes
router.post("/sos", requireAuth, validateBody(sosSchema), (req, res) => {
  const incident = emergencyService.triggerSOS({
    userId: req.user!.id,
    latitude: req.body.latitude,
    longitude: req.body.longitude,
    journeyId: req.body.journeyId,
    message: req.body.message
  });

  emitRealtimeEvent("emergency:sos", incident, "admin:ops");
  emitRealtimeEvent("emergency:sos", incident, `user:${req.user!.id}`);

  res.status(201).json({
    success: true,
    data: incident,
    message:
      "Emergency SOS incident created. Trusted contacts notified. For official emergency dispatch in India, call 112."
  });
});

router.get("/:id", requireAuth, (req, res, next) => {
  try {
    const incidentId = getRequiredParam(req, "id");
    const details = emergencyService.getIncidentById(
      incidentId,
      req.user!.id,
      req.user!.role
    );
    res.json({
      success: true,
      data: details,
      message: "Emergency incident retrieved"
    });
  } catch (err) {
    next(err);
  }
});

router.post(
  "/:id/location",
  requireAuth,
  validateBody(emergencyLocationUpdateSchema),
  (req, res, next) => {
    try {
      const incidentId = getRequiredParam(req, "id");
      const update = emergencyService.recordLocationUpdate({
        incidentId,
        userId: req.user!.id,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        accuracyMeters: req.body.accuracyMeters
      });

      emitRealtimeEvent("emergency:location", update, "admin:ops");

      res.json({
        success: true,
        data: update,
        message: "Emergency location update recorded"
      });
    } catch (err) {
      next(err);
    }
  }
);

router.post("/:id/cancel", requireAuth, (req, res, next) => {
  try {
    const incidentId = getRequiredParam(req, "id");
    const incident = emergencyService.cancelIncident(
      incidentId,
      req.user!.id,
      req.body?.reason
    );

    emitRealtimeEvent("emergency:status", incident, "admin:ops");

    res.json({
      success: true,
      data: incident,
      message: "Emergency SOS alert cancelled"
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:id/resolve", requireAuth, (req, res, next) => {
  try {
    const incidentId = getRequiredParam(req, "id");
    const incident = emergencyService.resolveIncident(
      incidentId,
      req.user!.id,
      req.user!.role,
      req.body?.note
    );

    emitRealtimeEvent("emergency:status", incident, "admin:ops");

    res.json({
      success: true,
      data: incident,
      message: "Emergency incident marked resolved"
    });
  } catch (err) {
    next(err);
  }
});

export default router;
