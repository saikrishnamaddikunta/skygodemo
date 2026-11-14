import React, { useEffect, useState } from "react";
import { AlertOctagon, PhoneCall, ShieldAlert, XCircle } from "lucide-react";
import { INDIA_EMERGENCY_NUMBER } from "@omnitransit/shared";
import { apiRequest } from "../../services/api";
import { useAppStore } from "../../stores/useAppStore";

export const SOSButton: React.FC<{
  journeyId?: string;
  onIncidentCreated?: (incident: any) => void;
}> = ({ journeyId, onIncidentCreated }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { origin, addToast } = useAppStore();

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      handleTriggerSOS();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => (c !== null ? c - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleTriggerSOS = async () => {
    setCountdown(null);
    setSubmitting(true);
    try {
      const incident = await apiRequest("/emergency/sos", {
        method: "POST",
        body: JSON.stringify({
          latitude: origin.latitude,
          longitude: origin.longitude,
          journeyId,
          message: "Commuter activated One-Tap Emergency SOS"
        })
      });
      addToast({
        type: "error",
        title: "Emergency SOS Activated",
        message: "Incident logged & verified contacts notified. For police/ambulance dial 112."
      });
      setDialogOpen(false);
      if (onIncidentCreated) onIncidentCreated(incident);
    } catch (err: any) {
      addToast({
        type: "error",
        title: "SOS Error",
        message: err.message || "Could not create SOS incident"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setDialogOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/30 border border-rose-400/40 transition-all"
      >
        <AlertOctagon className="w-4 h-4 animate-pulse" />
        <span>EMERGENCY SOS</span>
      </button>

      {dialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500 rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-8 h-8 shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-white">Confirm Emergency SOS</h3>
                <p className="text-xs text-rose-300">
                  Explicit confirmation required before alerting contacts
                </p>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-100 space-y-1.5">
              <p className="font-semibold flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-rose-300" />
                Official Emergency Fallback: Dial {INDIA_EMERGENCY_NUMBER} (India National Emergency Number)
              </p>
              <p className="opacity-90">
                SKYGO notifies your verified emergency contacts and logs your live coordinates for safety operators, but does not replace direct police/medical dispatch (112).
              </p>
            </div>

            {countdown !== null ? (
              <div className="mt-5 text-center py-4 bg-slate-950 rounded-xl border border-rose-500/40">
                <p className="text-xs text-slate-300">Sending Emergency Alert in</p>
                <p className="text-4xl font-extrabold text-rose-400 my-1">{countdown}s</p>
                <button
                  onClick={() => setCountdown(null)}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-white"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancel Countdown
                </button>
              </div>
            ) : (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  onClick={() => setDialogOpen(false)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
                >
                  Dismiss
                </button>
                <button
                  onClick={() => setCountdown(5)}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white"
                >
                  Start 5s Countdown
                </button>
                <button
                  disabled={submitting}
                  onClick={handleTriggerSOS}
                  className="w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white"
                >
                  {submitting ? "Triggering..." : "Trigger SOS Immediately"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
