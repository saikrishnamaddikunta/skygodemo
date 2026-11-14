import crypto from "crypto";
import { GeoPoint, INDIA_EMERGENCY_NUMBER } from "@omnitransit/shared";
import {
  db,
  EmergencyContactRecord,
  EmergencyIncidentRecord,
  EmergencyLocationUpdateRecord
} from "../../repositories/database.repository";

export const emergencyService = {
  triggerSOS(params: {
    userId: string;
    latitude: number;
    longitude: number;
    journeyId?: string;
    message?: string;
  }): EmergencyIncidentRecord {
    const state = db.getState();
    const now = new Date().toISOString();
    const verifiedContacts = state.emergency_contacts.filter(
      (c) => c.user_id === params.userId && c.is_verified
    );

    const providerMode =
      "IN_APP_REALTIME_SOCKET_DISPATCH (In-App Live Share & City Safety Command Center)";

    const contactsNotified = verifiedContacts.map((c) => ({
      contact_id: c.id,
      contact_name: c.contact_name,
      channel: c.notification_preferences.join("+"),
      delivery_status: "DISPATCHED_IN_APP",
      timestamp: now
    }));

    const incident: EmergencyIncidentRecord = {
      id: crypto.randomUUID(),
      user_id: params.userId,
      journey_id: params.journeyId,
      current_location: {
        latitude: params.latitude,
        longitude: params.longitude
      },
      message: params.message || "Emergency SOS triggered by commuter",
      status: "active",
      triggered_at: now,
      notification_status: {
        provider: providerMode,
        contacts_notified: contactsNotified,
        official_112_notice: `SKYGO is not a replacement for official emergency services. For immediate police/ambulance dispatch in India, call ${INDIA_EMERGENCY_NUMBER} directly.`
      },
      activity_log: [
        {
          timestamp: now,
          actor: params.userId,
          action: "SOS_TRIGGERED",
          note: `SOS initiated at (${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}). Contacts notified via ${providerMode}.`
        }
      ],
      created_at: now
    };

    state.emergency_incidents.unshift(incident);

    const initialLoc: EmergencyLocationUpdateRecord = {
      id: crypto.randomUUID(),
      incident_id: incident.id,
      location: { latitude: params.latitude, longitude: params.longitude },
      accuracy_meters: 12,
      recorded_at: now
    };
    state.emergency_location_updates.unshift(initialLoc);

    db.addNotification({
      user_id: params.userId,
      notification_type: "emergency_sos",
      title: "Emergency SOS Active",
      message: `Incident #${incident.id.slice(0, 8)} logged. Trusted contacts notified (${providerMode}). For police/medical emergency dial ${INDIA_EMERGENCY_NUMBER}.`,
      metadata: { incident_id: incident.id }
    });

    db.saveState();
    return incident;
  },

  getIncidentById(incidentId: string, requesterId: string, requesterRole: string) {
    const state = db.getState();
    const incident = state.emergency_incidents.find((i) => i.id === incidentId);
    if (!incident) {
      throw new Error("Emergency incident not found");
    }

    const isOwner = incident.user_id === requesterId;
    const isAuthorizedOperator = ["city_admin", "safety_operator"].includes(requesterRole);

    if (!isOwner && !isAuthorizedOperator) {
      const err = new Error("Forbidden: Unauthorized access to emergency incident");
      (err as Error & { statusCode?: number }).statusCode = 403;
      throw err;
    }

    const locationUpdates = state.emergency_location_updates.filter(
      (u) => u.incident_id === incidentId
    );

    return {
      incident,
      locationUpdates
    };
  },

  recordLocationUpdate(params: {
    incidentId: string;
    userId: string;
    latitude: number;
    longitude: number;
    accuracyMeters: number;
  }): EmergencyLocationUpdateRecord {
    const state = db.getState();
    const incident = state.emergency_incidents.find((i) => i.id === params.incidentId);
    if (!incident) {
      throw new Error("Emergency incident not found");
    }
    if (incident.user_id !== params.userId) {
      const err = new Error("Forbidden: Only the incident owner can push device location updates");
      (err as Error & { statusCode?: number }).statusCode = 403;
      throw err;
    }
    if (incident.status === "cancelled" || incident.status === "resolved") {
      throw new Error("Cannot update location on a closed incident");
    }

    const now = new Date().toISOString();
    incident.current_location = {
      latitude: params.latitude,
      longitude: params.longitude
    };

    const updateRecord: EmergencyLocationUpdateRecord = {
      id: crypto.randomUUID(),
      incident_id: incident.id,
      location: { latitude: params.latitude, longitude: params.longitude },
      accuracy_meters: params.accuracyMeters,
      recorded_at: now
    };

    state.emergency_location_updates.unshift(updateRecord);
    incident.activity_log.push({
      timestamp: now,
      actor: params.userId,
      action: "LOCATION_UPDATED",
      note: `Updated coordinates (${params.latitude.toFixed(4)}, ${params.longitude.toFixed(4)}) ±${params.accuracyMeters}m`
    });

    db.saveState();
    return updateRecord;
  },

  cancelIncident(incidentId: string, userId: string, reason?: string): EmergencyIncidentRecord {
    const state = db.getState();
    const incident = state.emergency_incidents.find((i) => i.id === incidentId);
    if (!incident) {
      throw new Error("Emergency incident not found");
    }
    if (incident.user_id !== userId) {
      const err = new Error("Forbidden: Only the commuter who triggered SOS can cancel it");
      (err as Error & { statusCode?: number }).statusCode = 403;
      throw err;
    }

    const now = new Date().toISOString();
    incident.status = "cancelled";
    incident.resolved_at = now;
    incident.activity_log.push({
      timestamp: now,
      actor: userId,
      action: "SOS_CANCELLED",
      note: reason || "Cancelled by commuter (accidental trigger / safe confirmation)"
    });

    db.saveState();
    return incident;
  },

  resolveIncident(
    incidentId: string,
    actorId: string,
    actorRole: string,
    note?: string
  ): EmergencyIncidentRecord {
    const state = db.getState();
    const incident = state.emergency_incidents.find((i) => i.id === incidentId);
    if (!incident) {
      throw new Error("Emergency incident not found");
    }

    const isOwner = incident.user_id === actorId;
    const isOperator = ["city_admin", "safety_operator"].includes(actorRole);
    if (!isOwner && !isOperator) {
      const err = new Error("Forbidden: Not authorized to resolve this incident");
      (err as Error & { statusCode?: number }).statusCode = 403;
      throw err;
    }

    const now = new Date().toISOString();
    incident.status = "resolved";
    incident.resolved_at = now;
    incident.activity_log.push({
      timestamp: now,
      actor: actorId,
      action: "SOS_RESOLVED",
      note: note || `Resolved by ${actorRole}`
    });

    db.saveState();
    return incident;
  },

  getContacts(userId: string): EmergencyContactRecord[] {
    return db.getState().emergency_contacts.filter((c) => c.user_id === userId);
  },

  addContact(
    userId: string,
    input: {
      contact_name: string;
      phone: string;
      email?: string;
      relationship: string;
      is_verified?: boolean;
      notification_preferences?: ("in_app" | "live_share")[];
    }
  ): EmergencyContactRecord {
    const state = db.getState();
    const contact: EmergencyContactRecord = {
      id: crypto.randomUUID(),
      user_id: userId,
      contact_name: input.contact_name,
      phone: input.phone,
      email: input.email,
      relationship: input.relationship,
      is_verified: input.is_verified ?? true,
      notification_preferences: input.notification_preferences || ["in_app", "live_share"],
      created_at: new Date().toISOString()
    };
    state.emergency_contacts.push(contact);
    db.saveState();
    return contact;
  },

  updateContact(
    userId: string,
    contactId: string,
    updates: Partial<EmergencyContactRecord>
  ): EmergencyContactRecord {
    const state = db.getState();
    const contact = state.emergency_contacts.find(
      (c) => c.id === contactId && c.user_id === userId
    );
    if (!contact) {
      throw new Error("Trusted contact not found");
    }
    if (updates.contact_name !== undefined) contact.contact_name = updates.contact_name;
    if (updates.phone !== undefined) contact.phone = updates.phone;
    if (updates.email !== undefined) contact.email = updates.email;
    if (updates.relationship !== undefined) contact.relationship = updates.relationship;
    if (updates.is_verified !== undefined) contact.is_verified = updates.is_verified;
    if (updates.notification_preferences !== undefined) {
      contact.notification_preferences = updates.notification_preferences;
    }

    db.saveState();
    return contact;
  },

  deleteContact(userId: string, contactId: string): void {
    const state = db.getState();
    const idx = state.emergency_contacts.findIndex(
      (c) => c.id === contactId && c.user_id === userId
    );
    if (idx === -1) {
      throw new Error("Trusted contact not found");
    }
    state.emergency_contacts.splice(idx, 1);
    db.saveState();
  }
};
