import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Bus,
  CheckCircle2,
  CloudLightning,
  Coins,
  FileText,
  Flame,
  Leaf,
  Megaphone,
  Plus,
  RefreshCw,
  ShieldAlert,
  Trash2,
  Users,
  Waves
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  EmptyState,
  LoadingSpinner,
  PageHeader
} from "../../components/common/GlobalComponents";
import { InteractiveMap } from "../../components/maps/InteractiveMap";
import { WeatherRiskBadge } from "../../components/routing/JourneyComponents";
import { apiRequest } from "../../services/api";
import { useAppStore } from "../../stores/useAppStore";
import { formatIndianDateTime } from "../../utils/format";

export const AdminOverviewPage: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = () => {
    setLoading(true);
    apiRequest("/admin/overview")
      .then(setOverview)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadOverview();
  }, []);

  if (loading || !overview) {
    return <LoadingSpinner label="Loading City Operations Command Overview..." />;
  }

  const { kpis, weatherStatus, underutilizedRoutes, recentIncidents, recentAuditLogs } =
    overview;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bengaluru Smart Mobility & Fleet Operations Command"
        subtitle="Real-time transit schedule synchronization, fleet utilization, Women at Night safety & demand-balancing analytics"
        badge="RBAC Protected"
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Active Fleet Vehicles</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{kpis.activeFleetCount}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Underutilized Transit Routes</p>
          <p className="text-2xl font-black text-amber-400 mt-1">
            {kpis.underutilizedRoutesCount}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">City-Wide CO2e Saved</p>
          <p className="text-2xl font-black text-emerald-400 mt-1">
            {kpis.totalCo2SavedKg} kg
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Active Emergency Incidents</p>
          <p className="text-2xl font-black text-rose-400 mt-1">
            {kpis.activeIncidentsCount}
          </p>
        </div>
      </div>

      {/* Weather & Underutilized Routes */}
      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center justify-between">
            <span>Underutilized Transit Routes (&lt;50% Occupancy)</span>
            <span className="text-xs text-emerald-400">Dynamic Multiplier Active</span>
          </h3>
          <div className="space-y-2.5 text-xs">
            {underutilizedRoutes.map((r: any) => (
              <div
                key={r.id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-white">{r.route_name}</p>
                  <p className="text-slate-400">
                    Occupancy: {r.utilization_pct}% • Mode: {r.transport_mode.toUpperCase()}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  {r.underutilized_multiplier}x Coins
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Recent Administrative Audit Trail
          </h3>
          <div className="space-y-2 text-xs">
            {recentAuditLogs.map((log: any) => (
              <div
                key={log.id}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-purple-300">{log.action}</span>
                  <p className="text-slate-400 text-[11px]">
                    Actor: {log.actor_email || log.actor_id} ({log.actor_role})
                  </p>
                </div>
                <span className="text-[11px] text-slate-500">
                  {formatIndianDateTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminMapPage: React.FC = () => {
  const [fleetData, setFleetData] = useState<any>(null);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [safetyData, setSafetyData] = useState<any>(null);

  useEffect(() => {
    apiRequest("/admin/fleet").then(setFleetData).catch(() => {});
    apiRequest("/weather/alerts").then(setWeatherData).catch(() => {});
    apiRequest("/safety/zones").then(setSafetyData).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interactive City Operations Map"
        subtitle="Unified spatial overlay of BMTC/BMRCL fleet vehicles, transit stops, flood zones, and safety lighting heatmaps"
        badge="PostGIS / Leaflet Spatial Grid"
      />

      <InteractiveMap
        stops={fleetData?.stops || []}
        fleetVehicles={fleetData?.vehicles || []}
        floodZones={weatherData?.floodZones || []}
        safetyHubs={safetyData?.hubScores || []}
        heightClass="h-[580px]"
      />
    </div>
  );
};

export const AdminFleetPage: React.FC = () => {
  const [fleetData, setFleetData] = useState<any>(null);

  useEffect(() => {
    apiRequest("/admin/fleet").then(setFleetData).catch(() => {});
  }, []);

  if (!fleetData) return <LoadingSpinner label="Loading fleet telemetry..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transit Fleet Monitoring"
        subtitle="Live occupancy, capacity, and coordinate telemetry across BMTC Bus, Namma Metro, and Yulu pods"
        badge={`${fleetData.vehicles?.length || 0} Active Units`}
      />

      <InteractiveMap
        stops={fleetData.stops || []}
        fleetVehicles={fleetData.vehicles || []}
        heightClass="h-[340px]"
      />

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 pr-4">Vehicle Number</th>
              <th className="py-2.5 pr-4">Mode</th>
              <th className="py-2.5 pr-4">Assigned Route</th>
              <th className="py-2.5 pr-4">Coordinates</th>
              <th className="py-2.5 pr-4">Occupancy / Capacity</th>
              <th className="py-2.5 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {(fleetData.vehicles || []).map((v: any) => (
              <tr key={v.id}>
                <td className="py-3 pr-4 font-bold text-white">{v.vehicle_number}</td>
                <td className="py-3 pr-4 uppercase text-blue-300 font-semibold">
                  {v.transport_mode}
                </td>
                <td className="py-3 pr-4 text-slate-300">{v.route_name}</td>
                <td className="py-3 pr-4 font-mono text-slate-400">
                  {v.current_location.latitude.toFixed(4)},{" "}
                  {v.current_location.longitude.toFixed(4)}
                </td>
                <td className="py-3 pr-4 text-slate-200">
                  {v.occupancy} / {v.capacity}
                </td>
                <td className="py-3 text-right">
                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold uppercase">
                    {v.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminRoutesPage: React.FC = () => {
  const [routes, setRoutes] = useState<any[]>([]);
  const { addToast } = useAppStore();

  const loadRoutes = () => {
    apiRequest("/admin/routes").then(setRoutes).catch(() => {});
  };

  useEffect(() => {
    loadRoutes();
  }, []);

  const handleUpdateMultiplier = async (routeId: string, multiplier: number, isActive: boolean) => {
    try {
      await apiRequest(`/admin/routes/${routeId}`, {
        method: "PATCH",
        body: JSON.stringify({
          underutilized_multiplier: multiplier,
          is_active: isActive
        })
      });
      loadRoutes();
      addToast({
        type: "success",
        title: "Route Updated",
        message: "Route multiplier and operational status saved and audited."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Update Failed", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transit Route & Multiplier Management"
        subtitle="Configure route operational availability and underutilized Carbon Coin multipliers"
        badge={`${routes.length} Configured Routes`}
      />

      <div className="space-y-3">
        {routes.map((r) => (
          <div
            key={r.id}
            className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{r.route_name}</span>
                <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 uppercase font-bold">
                  {r.transport_mode}
                </span>
              </div>
              <p className="text-slate-400">
                Operator: {r.operator_name} • Distance: {r.distance_km} km • Base Fare: ₹
                {r.base_cost_inr} • Utilization: {r.utilization_pct}%
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() =>
                  handleUpdateMultiplier(
                    r.id,
                    r.underutilized_multiplier === 1.5 ? 2.0 : 1.5,
                    r.is_active
                  )
                }
                className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold"
              >
                Multiplier: {r.underutilized_multiplier}x (Click to Toggle)
              </button>
              <button
                onClick={() =>
                  handleUpdateMultiplier(r.id, r.underutilized_multiplier, !r.is_active)
                }
                className={`px-3 py-1.5 rounded-xl font-bold ${
                  r.is_active
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-rose-500/20 text-rose-300"
                }`}
              >
                {r.is_active ? "ACTIVE" : "SUSPENDED"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminWeatherPage: React.FC = () => {
  const [current, setCurrent] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const { addToast } = useAppStore();

  const loadWeather = () => {
    apiRequest("/weather/current").then(setCurrent).catch(() => {});
    apiRequest("/weather/forecast").then(setForecast).catch(() => {});
  };

  useEffect(() => {
    loadWeather();
  }, []);

  const handleToggleDisruption = async () => {
    const res = await apiRequest("/weather/refresh", { method: "POST" });
    loadWeather();
    addToast({
      type: res.disruption_active ? "warning" : "info",
      title: res.disruption_active ? "Storm Disruption Activated" : "Storm Disruption Cleared",
      message: res.condition_text
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Corridor Disruption & Bottleneck Intelligence"
        subtitle="Rule-based disruption classification (LOW / MODERATE / HIGH / CRITICAL) and peak traffic bottleneck simulation controls"
        actions={
          <button
            onClick={handleToggleDisruption}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>
              {current?.disruptionActive
                ? "Restore Normal Corridor Flow"
                : "Trigger Peak Bottleneck Fixture"}
            </span>
          </button>
        }
      />

      {current && (
        <div className="grid sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <p className="text-xs text-slate-400">Current Hazard Level</p>
            <div className="mt-2">
              <WeatherRiskBadge risk={current.hazardLevel} />
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <p className="text-xs text-slate-400">Rainfall Intensity</p>
            <p className="text-2xl font-black text-sky-400 mt-1">
              {current.rainfallMmHr} mm/hr
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <p className="text-xs text-slate-400">Wind Speed</p>
            <p className="text-2xl font-black text-white mt-1">
              {current.windSpeedKmh} km/h
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <p className="text-xs text-slate-400">Temperature</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">
              {current.temperatureC}°C
            </p>
          </div>
        </div>
      )}

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">
          Multi-Hour Urban Weather Forecast
        </h3>
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          {(forecast?.forecasts || []).map((f: any, idx: number) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5"
            >
              <p className="font-bold text-slate-300">+{f.hoursAhead}h</p>
              <WeatherRiskBadge risk={f.hazardLevel} />
              <p className="text-white font-semibold">{f.temperatureC}°C</p>
              <p className="text-sky-300">{f.rainfallMmHr} mm/hr</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminFloodZonesPage: React.FC = () => {
  const [zones, setZones] = useState<any[]>([]);
  const [zoneName, setZoneName] = useState("");
  const [riskLevel, setRiskLevel] = useState<"LOW" | "MODERATE" | "HIGH" | "CRITICAL">("HIGH");
  const [riskScore, setRiskScore] = useState(80);
  const { addToast } = useAppStore();

  const loadZones = () => {
    apiRequest("/weather/alerts")
      .then((res) => setZones(res.floodZones || []))
      .catch(() => {});
  };

  useEffect(() => {
    loadZones();
  }, []);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/admin/flood-zones", {
        method: "POST",
        body: JSON.stringify({
          zone_name: zoneName,
          risk_level: riskLevel,
          risk_score: Number(riskScore),
          source: "BBMP / KSNDMC Admin Verified",
          is_active: true,
          coordinates: [
            { latitude: 12.94, longitude: 77.63 },
            { latitude: 12.94, longitude: 77.645 },
            { latitude: 12.952, longitude: 77.645 },
            { latitude: 12.952, longitude: 77.63 }
          ]
        })
      });
      setZoneName("");
      loadZones();
      addToast({
        type: "success",
        title: "Flood Zone Added",
        message: "Polygon flood-risk layer verified and activated."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Creation Failed", message: err.message });
    }
  };

  const handleDeleteZone = async (id: string) => {
    await apiRequest(`/admin/flood-zones/${id}`, { method: "DELETE" });
    loadZones();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Flood-Risk Zone Management"
        subtitle="Add, verify, and deactivate geospatial waterlogging polygons used by the routing engine"
        badge={`${zones.length} Active Flood Zones`}
      />

      <div className="grid lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreateZone}
          className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs"
        >
          <h3 className="text-sm font-bold text-white">Add Verified Flood-Risk Zone</h3>
          <div>
            <label className="block text-slate-300 mb-1">Zone Name</label>
            <input
              type="text"
              required
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="e.g. Ejipura Inner Ring Road Basin"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1">Risk Level</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              >
                <option value="LOW">LOW</option>
                <option value="MODERATE">MODERATE</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 mb-1">Risk Score (0-100)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={riskScore}
                onChange={(e) => setRiskScore(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            Create & Activate Flood Zone
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          <InteractiveMap floodZones={zones} heightClass="h-[280px]" />

          <div className="space-y-2.5">
            {zones.map((z) => (
              <div
                key={z.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">{z.zone_name}</p>
                  <p className="text-slate-400">
                    Risk: {z.risk_level} ({z.risk_score}/100) • Source: {z.source}
                  </p>
                </div>
                <button
                  onClick={() => handleDeleteZone(z.id)}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const AdminSafetyPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const { addToast } = useAppStore();

  useEffect(() => {
    apiRequest("/admin/safety/heatmap").then(setData).catch(() => {});
  }, []);

  if (!data) return <LoadingSpinner label="Loading safety analytics..." />;

  const handleSaveWeights = async () => {
    try {
      await apiRequest("/admin/safety/weights", {
        method: "PATCH",
        body: JSON.stringify(data.weights)
      });
      addToast({
        type: "success",
        title: "Safety Weights Saved",
        message: "Configurable SafeRoute scoring model updated."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Save Error", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Women at Night Mode & SafeRoute Scoring Weights"
        subtitle="Configure night-safety parameter weights (Smart LED Lighting, Population Activity, CCTV/Help Desks, Patrol Proximity)"
      />

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs">
          <h3 className="text-sm font-bold text-white">
            Configurable SafeRoute Scoring Model
          </h3>

          {Object.entries(data.weights || {}).map(([key, val]: [string, any]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-slate-300 capitalize">
                {key.replace(/([A-Z])/g, " $1")}
              </span>
              <input
                type="number"
                step={0.05}
                min={0}
                max={1}
                value={val}
                onChange={(e) =>
                  setData({
                    ...data,
                    weights: { ...data.weights, [key]: Number(e.target.value) }
                  })
                }
                className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-white text-right"
              />
            </div>
          ))}

          <button
            onClick={handleSaveWeights}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold"
          >
            Update SafeRoute Model Weights
          </button>
        </div>

        <div className="lg:col-span-7">
          <InteractiveMap safetyHubs={data.hubScores || []} heightClass="h-[380px]" />
        </div>
      </div>
    </div>
  );
};

export const AdminIncidentsPage: React.FC = () => {
  const [incidents, setIncidents] = useState<any[]>([]);
  const { addToast } = useAppStore();

  const loadIncidents = () => {
    apiRequest("/admin/incidents").then(setIncidents).catch(() => {});
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const handleResolve = async (id: string) => {
    try {
      await apiRequest(`/emergency/${id}/resolve`, {
        method: "POST",
        body: JSON.stringify({ note: "Resolved by Safety Command Operator" })
      });
      loadIncidents();
      addToast({
        type: "success",
        title: "Incident Resolved",
        message: "Emergency incident status updated to resolved."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Resolution Error", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency SOS Incident Monitoring"
        subtitle="Monitor commuter SOS triggers, live coordinates, contact delivery status, and resolution logs"
        badge={`${incidents.length} Total Incidents`}
      />

      {incidents.length === 0 ? (
        <EmptyState
          title="No emergency incidents triggered"
          description="Any SOS triggered by a commuter will immediately appear here in real time."
        />
      ) : (
        <div className="space-y-3">
          {incidents.map((inc) => (
            <div
              key={inc.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">
                    Incident #{inc.id.slice(0, 8)}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold uppercase">
                    {inc.status}
                  </span>
                </div>
                <p className="text-slate-300">
                  Location: {inc.current_location?.latitude?.toFixed(4)},{" "}
                  {inc.current_location?.longitude?.toFixed(4)} • Triggered:{" "}
                  {formatIndianDateTime(inc.triggered_at)}
                </p>
                <p className="text-slate-400">{inc.message}</p>
              </div>

              {inc.status === "active" && (
                <button
                  onClick={() => handleResolve(inc.id)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                >
                  Mark Incident Resolved
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const AdminCarbonPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);

  useEffect(() => {
    apiRequest("/admin/carbon/analytics").then(setAnalytics).catch(() => {});
  }, []);

  if (!analytics) return <LoadingSpinner label="Loading city carbon analytics..." />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="City-Wide Carbon & Sustainability Analytics"
        subtitle="Aggregated CO2e savings, Carbon Coin issuance, and modal share across Bengaluru"
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Total City CO2e Saved</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">
            {analytics.totalCo2SavedKg} kg
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Total Carbon Coins Issued</p>
          <p className="text-3xl font-black text-amber-400 mt-1">
            {analytics.totalCoinsEarned}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Total Coins Redeemed</p>
          <p className="text-3xl font-black text-purple-400 mt-1">
            {analytics.totalCoinsRedeemed}
          </p>
        </div>
      </div>

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
        <h3 className="text-sm font-bold text-white mb-4">
          Sustainable Modal Share (%)
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={analytics.modeSplit || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="mode" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  fontSize: "12px"
                }}
              />
              <Bar dataKey="sharePct" fill="#a855f7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export const AdminCampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [multiplier, setMultiplier] = useState(1.5);
  const { addToast } = useAppStore();

  const loadCampaigns = () => {
    apiRequest("/admin/campaigns").then(setCampaigns).catch(() => {});
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/admin/campaigns", {
        method: "POST",
        body: JSON.stringify({
          campaign_name: name,
          description,
          multiplier: Number(multiplier),
          eligible_modes: ["bus", "metro", "ebike"],
          start_time: new Date().toISOString(),
          end_time: new Date(Date.now() + 30 * 86400 * 1000).toISOString(),
          daily_reward_limit: 500,
          is_active: true
        })
      });
      setName("");
      setDescription("");
      loadCampaigns();
      addToast({
        type: "success",
        title: "Campaign Created",
        message: "Eco-incentive multiplier campaign activated."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Creation Failed", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eco-Incentive Campaign & Multiplier Management"
        subtitle="Create and manage dynamic Carbon Coin multiplier campaigns for off-peak routes"
      />

      <div className="grid lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleCreate}
          className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 text-xs"
        >
          <h3 className="text-sm font-bold text-white">Launch New Multiplier Campaign</h3>
          <div>
            <label className="block text-slate-300 mb-1">Campaign Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monsoon Metro Commuter Boost"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Description</label>
            <textarea
              required
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Reward Multiplier (1.0x - 5.0x)</label>
            <input
              type="number"
              step={0.25}
              min={1}
              max={5}
              value={multiplier}
              onChange={(e) => setMultiplier(Number(e.target.value))}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
          >
            Publish Eco Campaign
          </button>
        </form>

        <div className="lg:col-span-7 space-y-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{c.campaign_name}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                    {c.multiplier}x
                  </span>
                </div>
                <p className="text-slate-400 mt-1">{c.description}</p>
              </div>
              <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                {c.is_active ? "ACTIVE" : "INACTIVE"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const { addToast } = useAppStore();

  const loadUsers = () => {
    apiRequest("/admin/users").then(setUsers).catch(() => {});
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await apiRequest(`/admin/users/${userId}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role })
      });
      loadUsers();
      addToast({
        type: "success",
        title: "Role Updated",
        message: "User role updated and recorded in audit logs."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Role Update Failed", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User & Role Administration"
        subtitle="Manage commuter, city_admin, operations_manager, and safety_operator access levels"
        badge={`${users.length} Registered Accounts`}
      />

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="text-slate-400 border-b border-slate-800">
            <tr>
              <th className="py-2.5 pr-4">Full Name</th>
              <th className="py-2.5 pr-4">Email</th>
              <th className="py-2.5 pr-4">Phone</th>
              <th className="py-2.5 pr-4">Current Role</th>
              <th className="py-2.5 text-right">Change Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-3 pr-4 font-bold text-white">{u.full_name}</td>
                <td className="py-3 pr-4 text-slate-300">{u.email}</td>
                <td className="py-3 pr-4 text-slate-400">{u.phone || "—"}</td>
                <td className="py-3 pr-4">
                  <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold uppercase">
                    {u.role}
                  </span>
                </td>
                <td className="py-3 text-right">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white"
                  >
                    <option value="commuter">commuter</option>
                    <option value="city_admin">city_admin</option>
                    <option value="operations_manager">operations_manager</option>
                    <option value="safety_operator">safety_operator</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    apiRequest("/admin/audit-logs").then(setLogs).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrative Activity Audit Logs"
        subtitle="Immutable record of administrative actions, role updates, flood-zone changes, and campaign edits"
        badge={`${logs.length} Events`}
      />

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-2.5 text-xs">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          >
            <div>
              <span className="font-bold text-purple-300">{log.action}</span>
              <span className="text-slate-400 ml-2">
                Resource: {log.resource_type} {log.resource_id ? `(${log.resource_id})` : ""}
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Actor: {log.actor_email || log.actor_id} • Metadata:{" "}
                {JSON.stringify(log.metadata)}
              </p>
            </div>
            <span className="text-slate-400 shrink-0">
              {formatIndianDateTime(log.created_at)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
