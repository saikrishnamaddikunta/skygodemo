import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  CloudRain,
  Coins,
  Compass,
  Leaf,
  Navigation,
  Play,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import { ROUTING_PREFERENCES, TRANSPORT_MODES, TransportMode } from "@omnitransit/shared";
import {
  EmptyState,
  LoadingSpinner,
  PageHeader
} from "../../components/common/GlobalComponents";
import { SOSButton } from "../../components/emergency/SOSComponents";
import { InteractiveMap } from "../../components/maps/InteractiveMap";
import {
  JourneySegmentCard,
  RouteComparisonCard,
  SafeRouteToggle,
  WeatherRiskBadge,
  WomenNightModeToggle
} from "../../components/routing/JourneyComponents";
import { apiRequest } from "../../services/api";
import { useAppStore } from "../../stores/useAppStore";
import {
  BENGALURU_PRESET_LOCATIONS,
  formatIndianDateTime,
  formatIndianTime,
  formatINR
} from "../../utils/format";

export const CommuterDashboardPage: React.FC = () => {
  const {
    user,
    wallet,
    setWallet,
    origin,
    originLabel,
    destination,
    destinationLabel,
    saferouteEnabled,
    womenNightMode,
    setSafeRouteEnabled,
    setWomenNightMode,
    setJourneyEndpoints,
    setRouteResults,
    addToast
  } = useAppStore();

  const [weather, setWeather] = useState<any>(null);
  const [recentJourneys, setRecentJourneys] = useState<any[]>([]);
  const [ecoRecs, setEcoRecs] = useState<any[]>([]);
  const [assistantPrompt, setAssistantPrompt] = useState("");
  const [assistantReply, setAssistantReply] = useState<any>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [demoRunning, setDemoRunning] = useState(false);
  const navigate = useNavigate();

  const loadDashboardData = async () => {
    try {
      const [w, j, eco] = await Promise.all([
        apiRequest("/weather/current"),
        apiRequest("/journeys"),
        apiRequest("/ai/eco-recommendations", { method: "POST" })
      ]);
      setWeather(w);
      setRecentJourneys(Array.isArray(j) ? j.slice(0, 4) : []);
      setEcoRecs(eco?.data?.recommendations || []);
    } catch {
      // Handled gracefully
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleQuickPlan = async () => {
    try {
      const res = await apiRequest("/routing/alternatives", {
        method: "POST",
        body: JSON.stringify({
          origin,
          destination,
          originLabel,
          destinationLabel,
          routingPreference: womenNightMode ? "safest" : "balanced",
          saferouteEnabled,
          womenNightMode
        })
      });
      setRouteResults(
        res.alternatives,
        res.disruptedSegmentsDetected,
        res.weatherDisruptionActive
      );
      navigate("/app/routes");
    } catch (err: any) {
      addToast({
        type: "error",
        title: "Routing Error",
        message: err.message
      });
    }
  };

  const handleAskAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistantPrompt.trim()) return;
    setAssistantLoading(true);
    try {
      const res = await apiRequest("/ai/travel-assistant", {
        method: "POST",
        body: JSON.stringify({ prompt: assistantPrompt })
      });
      setAssistantReply(res.data);
    } catch (err: any) {
      addToast({ type: "error", title: "AI Assistant Error", message: err.message });
    } finally {
      setAssistantLoading(false);
    }
  };

  // One-Click Minimum Demonstration Scenario Runner (Steps 2-12)
  const runCompleteDemoScenario = async () => {
    setDemoRunning(true);
    try {
      // 1. Activate SafeRoute, Women at Night Mode & simulate arterial transit disruption
      setSafeRouteEnabled(true);
      setWomenNightMode(true);
      await apiRequest("/weather/refresh", {
        method: "POST",
        body: JSON.stringify({ simulateDisruption: true })
      });

      // 2. Recalculate congestion-free & Women-at-Night alternatives
      const recalc = await apiRequest("/routing/recalculate", {
        method: "POST",
        body: JSON.stringify({
          currentLocation: origin,
          destination,
          routingPreference: "safest",
          saferouteEnabled: true,
          womenNightMode: true
        })
      });

      setRouteResults(
        recalc.recalculatedRoutes,
        recalc.disruptedSegmentsDetected,
        recalc.weatherDisruptionActive
      );

      // 3. Plan, start, and complete the journey to credit Carbon Coins
      const planned = await apiRequest("/journeys/plan", {
        method: "POST",
        body: JSON.stringify({
          origin,
          destination,
          originLabel,
          destinationLabel,
          routingPreference: "safest",
          saferouteEnabled: true,
          womenNightMode: true,
          preferredModes: ["bus", "metro", "walking", "ebike"],
          selectedRouteId: recalc.recalculatedRoutes[0]?.id
        })
      });

      await apiRequest(`/journeys/${planned.journey.id}/start`, { method: "POST" });
      const completed = await apiRequest(`/journeys/${planned.journey.id}/complete`, {
        method: "POST"
      });

      if (completed?.reward?.wallet) {
        setWallet(completed.reward.wallet);
      }

      await loadDashboardData();
      addToast({
        type: "success",
        title: "Demonstration Scenario Completed!",
        message: `Storm rerouted → Journey completed → Credited +${
          completed?.reward?.transaction?.amount ?? 0
        } Carbon Coins!`
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Demo Error", message: err.message });
    } finally {
      setDemoRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Namaste, ${user?.full_name || "Commuter"}`}
        subtitle="AI Smart Mobility: Multi-modal route & schedule optimization, fleet efficiency, and Women at Night safety"
        badge="Bengaluru Smart Mobility Grid"
        actions={
          <button
            onClick={runCompleteDemoScenario}
            disabled={demoRunning}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5" />
            <span>
              {demoRunning
                ? "Running Full Scenario..."
                : "Run End-to-End Demo (Women @ Night + Congestion Reroute + Coins)"}
            </span>
          </button>
        }
      />

      {/* Active Transit & Corridor Flow Alert Banner */}
      {weather && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
            weather.disruptionActive
              ? "bg-amber-950/60 border-amber-500/50 text-amber-100"
              : "bg-slate-900/80 border-slate-800 text-slate-200"
          }`}
        >
          <div className="flex items-start gap-3">
            <Navigation
              className={`w-6 h-6 shrink-0 mt-0.5 ${
                weather.disruptionActive ? "text-amber-400" : "text-emerald-400"
              }`}
            />
            <div className="text-xs space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm">{weather.condition}</span>
                <WeatherRiskBadge risk={weather.hazardLevel || "LOW"} />
                <span className="text-slate-400">
                  Fleet Sync: Active • Corridor Telemetry Verified
                </span>
              </div>
              {weather.disruptionActive && (
                <p className="text-amber-200 font-medium">
                  Affected Bottleneck: {weather.affectedCorridor} — Surface buses dynamically synchronized with Namma Metro + Route 12 Electric Feeder.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={async () => {
              await apiRequest("/weather/refresh", { method: "POST" });
              loadDashboardData();
            }}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white shrink-0 flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              {weather.disruptionActive
                ? "Clear Corridor Bottleneck"
                : "Simulate Peak Congestion & Delay [DEV FIXTURE]"}
            </span>
          </button>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Carbon Coin Balance</span>
            <Coins className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-400 mt-2">
            {wallet?.balance ?? 0} Coins
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Lifetime Earned: {wallet?.lifetime_earned ?? 0} Coins
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total CO2e Saved</span>
            <Leaf className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-2">
            {wallet?.lifetime_co2_saved ?? 0} kg
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Verified against India GHG baseline
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-fuchsia-500/30">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Women at Night Mode</span>
            <ShieldCheck className="w-4 h-4 text-fuchsia-400" />
          </div>
          <p className="text-2xl font-extrabold text-fuchsia-300 mt-2">
            {womenNightMode ? "PROTECTED" : saferouteEnabled ? "SAFEROUTE" : "STANDBY"}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Lit corridors, Women&apos;s Help Desk & 24x7 Patrols
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Completed Journeys</span>
            <Compass className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">
            {recentJourneys.filter((j) => j.status === "completed").length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Multi-modal Metro + Bus + E-Bike
          </p>
        </div>
      </div>

      {/* Quick Route Planner + Map */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-emerald-400" />
            <span>Quick Multi-Modal Route Planner</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Origin Hub</label>
            <select
              value={originLabel}
              onChange={(e) => {
                const found = BENGALURU_PRESET_LOCATIONS.find((l) => l.label === e.target.value);
                if (found) {
                  setJourneyEndpoints({
                    origin: { latitude: found.latitude, longitude: found.longitude },
                    originLabel: found.label
                  });
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            >
              {BENGALURU_PRESET_LOCATIONS.map((loc) => (
                <option key={loc.label} value={loc.label}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Destination Hub
            </label>
            <select
              value={destinationLabel}
              onChange={(e) => {
                const found = BENGALURU_PRESET_LOCATIONS.find((l) => l.label === e.target.value);
                if (found) {
                  setJourneyEndpoints({
                    destination: { latitude: found.latitude, longitude: found.longitude },
                    destinationLabel: found.label
                  });
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            >
              {BENGALURU_PRESET_LOCATIONS.map((loc) => (
                <option key={loc.label} value={loc.label}>
                  {loc.label}
                </option>
              ))}
            </select>
          </div>

          <SafeRouteToggle enabled={saferouteEnabled} onChange={setSafeRouteEnabled} />
          <WomenNightModeToggle enabled={womenNightMode} onChange={setWomenNightMode} />

          <div className="flex gap-2.5 pt-2">
            <button
              onClick={handleQuickPlan}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20"
            >
              Discover Multi-Modal Routes →
            </button>
            <Link
              to="/app/plan"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
            >
              Advanced Planner
            </Link>
          </div>
        </div>

        <div className="lg:col-span-7">
          <InteractiveMap
            origin={origin}
            destination={destination}
            heightClass="h-[340px]"
          />
        </div>
      </div>

      {/* Gemini AI Eco-Recommendations & Travel Assistant */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Gemini AI Eco-Gamification Recommendations</span>
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300">
              Verified Multipliers
            </span>
          </div>

          {ecoRecs.length === 0 ? (
            <LoadingSpinner label="Analyzing eco campaigns..." />
          ) : (
            <div className="space-y-3">
              {ecoRecs.map((rec: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300">{rec.title}</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                      {rec.multiplier}x Coins (+{rec.estimated_extra_coins})
                    </span>
                  </div>
                  <p className="text-slate-300">{rec.description}</p>
                  <p className="text-[11px] text-slate-400">
                    Saves ~{rec.estimated_co2_savings} kg CO2e • {rec.reason}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Conversational Travel Assistant */}
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>SKYGO AI Advisory Assistant</span>
          </h2>

          <form onSubmit={handleAskAssistant} className="flex gap-2">
            <input
              type="text"
              value={assistantPrompt}
              onChange={(e) => setAssistantPrompt(e.target.value)}
              placeholder="Ask about SafeRoute night lighting, flood zones, or Carbon Coins..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
            <button
              type="submit"
              disabled={assistantLoading}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{assistantLoading ? "..." : "Ask AI"}</span>
            </button>
          </form>

          {assistantReply && (
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs space-y-2">
              <p className="text-slate-200 leading-relaxed">{assistantReply.message}</p>
              {assistantReply.warnings?.length > 0 && (
                <div className="text-amber-300 text-[11px]">
                  Note: {assistantReply.warnings.join(" ")}
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                {assistantReply.suggested_actions?.map((act: any, i: number) => (
                  <Link
                    key={i}
                    to={
                      act.type === "enable_saferoute"
                        ? "/app/saferoute"
                        : act.type === "view_wallet"
                        ? "/app/wallet"
                        : act.type === "check_weather"
                        ? "/app/plan"
                        : "/app/routes"
                    }
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold"
                  >
                    {act.label} →
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const JourneyPlannerPage: React.FC = () => {
  const {
    origin,
    originLabel,
    destination,
    destinationLabel,
    routingPreference,
    preferredModes,
    maxWalkingDistance,
    maximumBudget,
    saferouteEnabled,
    womenNightMode,
    setSafeRouteEnabled,
    setWomenNightMode,
    setJourneyEndpoints,
    setRouteResults,
    addToast
  } = useAppStore();

  const [clickTarget, setClickTarget] = useState<"origin" | "destination">("destination");
  const [stops, setStops] = useState<any[]>([]);
  const [floodZones, setFloodZones] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    apiRequest(`/routing/nearby-transit?latitude=${origin.latitude}&longitude=${origin.longitude}&radiusMeters=10000`)
      .then((res) => setStops(res.stops || []))
      .catch(() => {});
    apiRequest("/weather/alerts")
      .then((res) => setFloodZones(res.floodZones || []))
      .catch(() => {});
  }, []);

  const toggleMode = (mode: TransportMode) => {
    const exists = preferredModes.includes(mode);
    const next = exists
      ? preferredModes.filter((m) => m !== mode)
      : [...preferredModes, mode];
    if (next.length > 0) {
      setJourneyEndpoints({ preferredModes: next });
    }
  };

  const handleSearchRoutes = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    try {
      const res = await apiRequest("/routing/alternatives", {
        method: "POST",
        body: JSON.stringify({
          origin,
          destination,
          originLabel,
          destinationLabel,
          routingPreference,
          maximumBudget,
          maxWalkingDistance,
          saferouteEnabled,
          womenNightMode,
          weatherAvoidance: true,
          preferredModes
        })
      });
      setRouteResults(
        res.alternatives,
        res.disruptedSegmentsDetected,
        res.weatherDisruptionActive
      );
      addToast({
        type: "success",
        title: "Routes Generated",
        message: `Found ${res.alternatives.length} multi-modal alternatives`
      });
      navigate("/app/routes");
    } catch (err: any) {
      addToast({ type: "error", title: "Search Failed", message: err.message });
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Smart Mobility Multi-Modal Planner"
        subtitle="Synchronize Namma Metro, BMTC Bus, E-Bike & Walking with Fleet Optimization and Women at Night Protection"
        badge="Dijkstra & A* Engine"
      />

      <div className="grid lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleSearchRoutes}
          className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Origin Hub or Coordinate
            </label>
            <select
              value={originLabel}
              onChange={(e) => {
                const found = BENGALURU_PRESET_LOCATIONS.find((l) => l.label === e.target.value);
                if (found) {
                  setJourneyEndpoints({
                    origin: { latitude: found.latitude, longitude: found.longitude },
                    originLabel: found.label
                  });
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            >
              {BENGALURU_PRESET_LOCATIONS.map((l) => (
                <option key={l.label} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Coords: {origin.latitude.toFixed(4)}, {origin.longitude.toFixed(4)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Destination Hub or Coordinate
            </label>
            <select
              value={destinationLabel}
              onChange={(e) => {
                const found = BENGALURU_PRESET_LOCATIONS.find((l) => l.label === e.target.value);
                if (found) {
                  setJourneyEndpoints({
                    destination: { latitude: found.latitude, longitude: found.longitude },
                    destinationLabel: found.label
                  });
                }
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            >
              {BENGALURU_PRESET_LOCATIONS.map((l) => (
                <option key={l.label} value={l.label}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Coords: {destination.latitude.toFixed(4)}, {destination.longitude.toFixed(4)}
            </p>
          </div>

          {/* Routing Strategy Profile */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Optimization Strategy Profile
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ROUTING_PREFERENCES.map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => setJourneyEndpoints({ routingPreference: pref })}
                  className={`px-3 py-2 rounded-xl border text-xs font-semibold capitalize ${
                    routingPreference === pref
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-300"
                      : "bg-slate-950 border-slate-800 text-slate-400"
                  }`}
                >
                  {pref === "eco" ? "Eco-Friendly" : `${pref} Route`}
                </button>
              ))}
            </div>
          </div>

          {/* Transport Modes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Preferred Transportation Modes
            </label>
            <div className="flex flex-wrap gap-2">
              {TRANSPORT_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMode(m)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold uppercase ${
                    preferredModes.includes(m)
                      ? "bg-blue-500/20 border-blue-500 text-blue-300"
                      : "bg-slate-950 border-slate-800 text-slate-500"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Max Budget (INR ₹)
              </label>
              <input
                type="number"
                min={0}
                value={maximumBudget}
                onChange={(e) =>
                  setJourneyEndpoints({ maximumBudget: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Max Walk (meters)
              </label>
              <input
                type="number"
                min={100}
                step={100}
                value={maxWalkingDistance}
                onChange={(e) =>
                  setJourneyEndpoints({ maxWalkingDistance: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
              />
            </div>
          </div>

          <SafeRouteToggle enabled={saferouteEnabled} onChange={setSafeRouteEnabled} />
          <WomenNightModeToggle enabled={womenNightMode} onChange={setWomenNightMode} />

          <button
            type="submit"
            disabled={searching}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25"
          >
            {searching ? "Calculating Multi-Modal Graph..." : "Compute Optimal Routes →"}
          </button>
        </form>

        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 text-xs">
            <span className="text-slate-300">
              Click map to set custom coordinates for:
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setClickTarget("origin")}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  clickTarget === "origin"
                    ? "bg-emerald-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                Origin Pin
              </button>
              <button
                type="button"
                onClick={() => setClickTarget("destination")}
                className={`px-3 py-1 rounded-lg font-semibold ${
                  clickTarget === "destination"
                    ? "bg-rose-600 text-white"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                Destination Pin
              </button>
            </div>
          </div>

          <InteractiveMap
            origin={origin}
            destination={destination}
            stops={stops}
            floodZones={floodZones}
            heightClass="h-[500px]"
            onMapClick={(pt) => {
              if (clickTarget === "origin") {
                setJourneyEndpoints({
                  origin: pt,
                  originLabel: `Map Pin (${pt.latitude.toFixed(3)}, ${pt.longitude.toFixed(3)})`
                });
              } else {
                setJourneyEndpoints({
                  destination: pt,
                  destinationLabel: `Map Pin (${pt.latitude.toFixed(3)}, ${pt.longitude.toFixed(3)})`
                });
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

export const RouteComparisonPage: React.FC = () => {
  const {
    origin,
    originLabel,
    destination,
    destinationLabel,
    routingPreference,
    saferouteEnabled,
    womenNightMode,
    preferredModes,
    routeAlternatives,
    selectedRoute,
    disruptedSegmentsDetected,
    weatherDisruptionActive,
    setRouteResults,
    setSelectedRoute,
    addToast
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<any>(null);
  const navigate = useNavigate();

  const fetchAlternatives = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("/routing/alternatives", {
        method: "POST",
        body: JSON.stringify({
          origin,
          destination,
          originLabel,
          destinationLabel,
          routingPreference,
          saferouteEnabled,
          womenNightMode,
          preferredModes
        })
      });
      setRouteResults(
        res.alternatives,
        res.disruptedSegmentsDetected,
        res.weatherDisruptionActive
      );

      const aiRes = await apiRequest("/ai/route-explanation", {
        method: "POST",
        body: JSON.stringify({
          alternatives: res.alternatives,
          routingPreference,
          saferouteEnabled
        })
      });
      setAiExplanation(aiRes);
    } catch (err: any) {
      addToast({ type: "error", title: "Route Error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeAlternatives.length === 0) {
      fetchAlternatives();
    }
  }, []);

  const handleStartJourney = async (routeId: string) => {
    try {
      const planned = await apiRequest("/journeys/plan", {
        method: "POST",
        body: JSON.stringify({
          origin,
          destination,
          originLabel,
          destinationLabel,
          routingPreference,
          saferouteEnabled,
          womenNightMode,
          preferredModes,
          selectedRouteId: routeId
        })
      });

      await apiRequest(`/journeys/${planned.journey.id}/start`, {
        method: "POST"
      });

      addToast({
        type: "success",
        title: "Journey Started",
        message: "Live multi-modal navigation is now active."
      });

      navigate(`/app/navigation/${planned.journey.id}`);
    } catch (err: any) {
      addToast({ type: "error", title: "Could not start journey", message: err.message });
    }
  };

  const handleSimulateWeatherAndRecalculate = async () => {
    setLoading(true);
    try {
      await apiRequest("/weather/refresh", {
        method: "POST",
        body: JSON.stringify({ simulateDisruption: !weatherDisruptionActive })
      });

      const recalc = await apiRequest("/routing/recalculate", {
        method: "POST",
        body: JSON.stringify({
          currentLocation: origin,
          destination,
          routingPreference,
          saferouteEnabled,
          womenNightMode
        })
      });

      setRouteResults(
        recalc.recalculatedRoutes,
        recalc.disruptedSegmentsDetected,
        recalc.weatherDisruptionActive
      );
    } catch (err: any) {
      addToast({ type: "error", title: "Recalculation failed", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multi-Modal Route Alternatives"
        subtitle={`${originLabel} → ${destinationLabel}`}
        badge={`${routeAlternatives.length} Verified Combinations`}
        actions={
          <button
            onClick={handleSimulateWeatherAndRecalculate}
            className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>
              {weatherDisruptionActive
                ? "Clear Arterial Bottleneck & Restore Direct Route"
                : "Simulate Peak Congestion Bottleneck & Recalculate [DEV FIXTURE]"}
            </span>
          </button>
        }
      />

      {disruptedSegmentsDetected.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-500/50 text-xs text-rose-100 space-y-1">
          <p className="font-bold text-sm flex items-center gap-2 text-rose-300">
            <AlertTriangle className="w-4 h-4" />
            Predictive Smart Mobility Rerouting Active: Congested Surface Bottlenecks Bypassed
          </p>
          <ul className="list-disc list-inside text-rose-200">
            {disruptedSegmentsDetected.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      {aiExplanation && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              SKYGO AI Advisory Summary ({aiExplanation.source})
            </span>
            <span className="text-slate-400">
              Confidence: {Math.round((aiExplanation.explanation?.confidence ?? 0.9) * 100)}%
            </span>
          </div>
          <p className="text-slate-200">{aiExplanation.explanation?.summary}</p>
        </div>
      )}

      {loading ? (
        <LoadingSpinner label="Evaluating multi-modal transit graph..." />
      ) : routeAlternatives.length === 0 ? (
        <EmptyState
          title="No routes generated yet"
          description="Select an origin and destination to compute multi-modal routes."
        />
      ) : (
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-4">
            {routeAlternatives.map((alt) => (
              <RouteComparisonCard
                key={alt.id}
                route={alt}
                selected={selectedRoute?.id === alt.id}
                onSelect={() => setSelectedRoute(alt)}
                onStartNavigation={() => handleStartJourney(alt.id)}
              />
            ))}
          </div>

          <div className="lg:col-span-5">
            <div className="sticky top-24 space-y-4">
              <InteractiveMap
                origin={origin}
                destination={destination}
                selectedRoute={selectedRoute}
                alternatives={routeAlternatives}
                heightClass="h-[480px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const ActiveNavigationPage: React.FC = () => {
  const { journeyId } = useParams<{ journeyId: string }>();
  const [journeyData, setJourneyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [shareStatus, setShareStatus] = useState<string>("");
  const { setWallet, addToast } = useAppStore();
  const navigate = useNavigate();

  const loadJourney = async () => {
    if (!journeyId) return;
    setLoading(true);
    try {
      const res = await apiRequest(`/journeys/${journeyId}`);
      setJourneyData(res);
    } catch (err: any) {
      addToast({ type: "error", title: "Navigation Error", message: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJourney();
  }, [journeyId]);

  const handleCompleteJourney = async () => {
    if (!journeyId) return;
    setCompleting(true);
    try {
      const res = await apiRequest(`/journeys/${journeyId}/complete`, {
        method: "POST"
      });
      if (res?.reward?.wallet) {
        setWallet(res.reward.wallet);
      }
      addToast({
        type: "success",
        title: "Journey Completed!",
        message: `Earned +${res?.reward?.transaction?.amount ?? 0} Carbon Coins (${
          res?.reward?.metrics?.co2SavedKg ?? 0
        } kg CO2e saved)!`
      });
      loadJourney();
    } catch (err: any) {
      addToast({ type: "error", title: "Completion Failed", message: err.message });
    } finally {
      setCompleting(false);
    }
  };

  const handleShareWithTrustedContacts = async () => {
    if (!journeyId) return;
    try {
      const contacts = await apiRequest("/emergency/contacts");
      if (!contacts || contacts.length === 0) {
        addToast({
          type: "warning",
          title: "No Trusted Contacts",
          message: "Add a trusted contact first on the Trusted Contacts page."
        });
        return;
      }
      const share = await apiRequest("/safety/share-journey", {
        method: "POST",
        body: JSON.stringify({
          journeyId,
          contactIds: contacts.map((c: any) => c.id),
          enableLiveLocation: true,
          note: "Sharing live multi-modal journey via SKYGO SafeRoute"
        })
      });
      setShareStatus(`Shared (Token: ${share.share_token})`);
      addToast({
        type: "success",
        title: "Live Journey Shared",
        message: `Shared with ${contacts.length} verified contact(s).`
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Share Failed", message: err.message });
    }
  };

  if (loading) return <LoadingSpinner label="Loading live journey telemetry..." />;
  if (!journeyData?.journey) {
    return (
      <EmptyState
        title="Journey Not Found"
        description="Could not find the requested journey record."
      />
    );
  }

  const { journey, segments } = journeyData;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Live Navigation: ${journey.origin_label} → ${journey.destination_label}`}
        subtitle={`Status: ${journey.status.toUpperCase()} • Started: ${formatIndianDateTime(
          journey.started_at || journey.created_at
        )}`}
        badge={journey.saferoute_enabled ? "SafeRoute Protected" : "Standard Navigation"}
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleShareWithTrustedContacts}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{shareStatus || "Share Live Journey"}</span>
            </button>
            <SOSButton journeyId={journey.id} />
          </div>
        }
      />

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <InteractiveMap
            origin={journey.origin}
            destination={journey.destination}
            selectedRoute={journey.route_snapshot}
            heightClass="h-[460px]"
          />
        </div>

        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Navigation className="w-4 h-4 text-emerald-400" />
              <span>Active Journey Segments</span>
            </h3>
            <span className="text-xs font-bold text-white">
              Est. Cost: {formatINR(journey.estimated_cost)}
            </span>
          </div>

          <div className="space-y-2.5">
            {(journey.route_snapshot?.segments || []).map((seg: any) => (
              <JourneySegmentCard key={seg.id} segment={seg} />
            ))}
            {!journey.route_snapshot?.segments &&
              segments.map((seg: any) => (
                <div
                  key={seg.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs"
                >
                  <span className="font-bold text-emerald-400 uppercase">
                    {seg.sequence_number}. {seg.transport_mode}
                  </span>{" "}
                  — {seg.from_stop_name} → {seg.to_stop_name} ({seg.distance_km} km,{" "}
                  {seg.duration_minutes} mins)
                </div>
              ))}
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-1">
            <p className="font-semibold text-emerald-300">
              Estimated CO2e Savings: {journey.carbon_saved} kg CO2e
            </p>
            <p className="text-slate-300">
              Complete this journey to credit verified Carbon Coins to your immutable wallet ledger.
            </p>
          </div>

          {journey.status !== "completed" ? (
            <button
              onClick={handleCompleteJourney}
              disabled={completing}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {completing
                  ? "Validating & Issuing Carbon Coins..."
                  : "Mark Journey Completed & Claim Carbon Coins"}
              </span>
            </button>
          ) : (
            <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-center space-y-2">
              <p className="text-sm font-bold text-emerald-300">
                Journey Completed & Carbon Coins Credited!
              </p>
              <button
                onClick={() => navigate("/app/wallet")}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold"
              >
                View Carbon Wallet Ledger →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
