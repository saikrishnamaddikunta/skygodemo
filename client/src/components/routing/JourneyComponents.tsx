import React from "react";
import {
  Activity,
  Bike,
  Bus,
  Clock,
  Coins,
  Footprints,
  Leaf,
  Moon,
  ShieldCheck,
  TrainFront
} from "lucide-react";
import { HazardLevel, RouteAlternative, RouteSegmentDetail, TransportMode } from "@omnitransit/shared";
import { formatIndianTime, formatINR } from "../../utils/format";

export const TransitModeBadge: React.FC<{ mode: TransportMode }> = ({ mode }) => {
  const styles: Record<TransportMode, { bg: string; label: string; icon: React.ReactNode }> = {
    metro: {
      bg: "bg-purple-500/15 text-purple-300 border-purple-500/30",
      label: "Metro",
      icon: <TrainFront className="w-3.5 h-3.5" />
    },
    bus: {
      bg: "bg-blue-500/15 text-blue-300 border-blue-500/30",
      label: "Public Bus",
      icon: <Bus className="w-3.5 h-3.5" />
    },
    ebike: {
      bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      label: "E-Bike",
      icon: <Bike className="w-3.5 h-3.5" />
    },
    walking: {
      bg: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      label: "Walk",
      icon: <Footprints className="w-3.5 h-3.5" />
    },
    cycling: {
      bg: "bg-teal-500/15 text-teal-300 border-teal-500/30",
      label: "Cycle",
      icon: <Bike className="w-3.5 h-3.5" />
    },
    train: {
      bg: "bg-pink-500/15 text-pink-300 border-pink-500/30",
      label: "Local Train",
      icon: <TrainFront className="w-3.5 h-3.5" />
    }
  };

  const current = styles[mode] || styles.bus;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${current.bg}`}
    >
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
};

export const WeatherRiskBadge: React.FC<{ risk: HazardLevel }> = ({ risk }) => {
  const map: Record<HazardLevel, string> = {
    LOW: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    MODERATE: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    HIGH: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    CRITICAL: "bg-rose-500/20 text-rose-300 border-rose-500/40"
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${map[risk]}`}
    >
      <Activity className="w-3 h-3" />
      <span>Disruption Risk: {risk}</span>
    </span>
  );
};

export const SafeRouteToggle: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
      enabled
        ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-200"
        : "bg-slate-900 border-slate-800 text-slate-400"
    }`}
  >
    <div className="flex items-center gap-2 text-left">
      <ShieldCheck className={`w-4 h-4 shrink-0 ${enabled ? "text-emerald-400" : "text-slate-500"}`} />
      <span>SafeRoute Mode (Lighting, CCTV & Patrol Priority)</span>
    </div>
    <span
      className={`px-2 py-0.5 rounded text-[10px] shrink-0 ${
        enabled ? "bg-emerald-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-400"
      }`}
    >
      {enabled ? "ACTIVE" : "OFF"}
    </span>
  </button>
);

export const WomenNightModeToggle: React.FC<{
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}> = ({ enabled, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!enabled)}
    className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
      enabled
        ? "bg-fuchsia-500/15 border-fuchsia-500/50 text-fuchsia-200 shadow-sm shadow-fuchsia-500/10"
        : "bg-slate-900 border-slate-800 text-slate-400"
    }`}
  >
    <div className="flex items-center gap-2 text-left">
      <Moon className={`w-4 h-4 shrink-0 ${enabled ? "text-fuchsia-400" : "text-slate-500"}`} />
      <span>Women at Night Mode (High-Lumen Lit Corridors, Women&apos;s Help Desk & 24x7 Patrols)</span>
    </div>
    <span
      className={`px-2 py-0.5 rounded text-[10px] shrink-0 ${
        enabled ? "bg-fuchsia-500 text-slate-950 font-bold" : "bg-slate-800 text-slate-400"
      }`}
    >
      {enabled ? "NIGHT SAFE" : "OFF"}
    </span>
  </button>
);

export const JourneySegmentCard: React.FC<{ segment: RouteSegmentDetail }> = ({ segment }) => (
  <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
    <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center font-bold shrink-0">
      {segment.sequenceNumber}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <TransitModeBadge mode={segment.transportMode} />
        <span className="font-semibold text-white truncate">
          {segment.routeLineName || segment.transportMode.toUpperCase()}
        </span>
        <span className="text-slate-400">
          {segment.distanceKm} km • {segment.durationMinutes} mins
        </span>
        {segment.waitMinutes > 0 && (
          <span className="text-amber-300">({segment.waitMinutes}m wait)</span>
        )}
      </div>
      <p className="text-slate-300 mt-1">
        {segment.fromStopName} → {segment.toStopName}
      </p>
    </div>
    <div className="text-right shrink-0">
      <p className="font-semibold text-white">{formatINR(segment.costInr)}</p>
      <p className="text-[11px] text-emerald-400">Safety {segment.safetyScore}/100</p>
    </div>
  </div>
);

export const RouteComparisonCard: React.FC<{
  route: RouteAlternative;
  selected: boolean;
  onSelect: () => void;
  onStartNavigation?: () => void;
}> = ({ route, selected, onSelect, onStartNavigation }) => {
  const uniqueModes = Array.from(new Set(route.segments.map((s) => s.transportMode)));

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl border p-5 transition-all ${
        selected
          ? "bg-slate-900 border-emerald-500 shadow-lg shadow-emerald-500/10"
          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white">{route.label}</h3>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              {route.badge}
            </span>
            <WeatherRiskBadge risk={route.weatherRisk} />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {route.originLabel} → {route.destinationLabel} • Est. Arrival{" "}
            <strong className="text-slate-200">{formatIndianTime(route.estimatedArrivalIso)}</strong>
          </p>
        </div>

        <div className="text-right">
          <div className="text-xl font-extrabold text-white">{formatINR(route.totalCostInr)}</div>
          <div className="text-xs text-slate-400 flex items-center justify-end gap-1">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{route.totalDurationMinutes} mins total</span>
          </div>
        </div>
      </div>

      {/* Mode badges & key metrics */}
      <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          {uniqueModes.map((m) => (
            <TransitModeBadge key={m} mode={m} />
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 text-emerald-300 font-medium">
            <ShieldCheck className="w-4 h-4" /> Safety: {route.safetyScore}/100
          </span>
          <span className="inline-flex items-center gap-1 text-teal-300 font-medium">
            <Leaf className="w-4 h-4" /> Saves {route.co2SavedKg} kg CO2
          </span>
          <span className="inline-flex items-center gap-1 text-amber-300 font-semibold">
            <Coins className="w-4 h-4" /> +{route.estimatedCarbonCoins} Coins ({route.activeMultiplier}x)
          </span>
        </div>
      </div>

      {/* Explanation reasoning */}
      <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/70 text-xs text-slate-300 space-y-1">
        <p className="font-semibold text-emerald-300">{route.explanation.summary}</p>
        <ul className="list-disc list-inside text-slate-400 space-y-0.5">
          {route.explanation.reasoning.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </div>

      {selected && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Connected Multi-Modal Segments ({route.segments.length})
          </p>
          {route.segments.map((seg) => (
            <JourneySegmentCard key={seg.id} segment={seg} />
          ))}
          {onStartNavigation && (
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartNavigation();
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25"
              >
                Select Route & Start Active Journey →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
