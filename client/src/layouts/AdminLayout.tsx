import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bus,
  CloudLightning,
  FileText,
  Flame,
  LayoutGrid,
  LogOut,
  Map,
  Megaphone,
  Menu,
  Route,
  ShieldAlert,
  Users,
  Waves,
  X
} from "lucide-react";
import { DevFixtureBanner } from "../components/common/GlobalComponents";
import { useAppStore } from "../stores/useAppStore";

const adminNavItems = [
  { to: "/admin", label: "City Overview", icon: LayoutGrid, end: true },
  { to: "/admin/map", label: "City Operations Map", icon: Map },
  { to: "/admin/fleet", label: "Transit Fleet Monitor", icon: Bus },
  { to: "/admin/routes", label: "Route & Schedule Sync", icon: Route },
  { to: "/admin/weather", label: "Corridor Disruptions", icon: CloudLightning },
  { to: "/admin/flood-zones", label: "Bottleneck Zones", icon: Waves },
  { to: "/admin/safety", label: "Women @ Night & Safety", icon: Flame },
  { to: "/admin/incidents", label: "Emergency SOS Incidents", icon: ShieldAlert },
  { to: "/admin/carbon", label: "Carbon & Eco Analytics", icon: BarChart3 },
  { to: "/admin/campaigns", label: "Eco Campaigns & Multipliers", icon: Megaphone },
  { to: "/admin/users", label: "User Administration", icon: Users },
  { to: "/admin/audit-logs", label: "Audit Logs", icon: FileText }
];

export const AdminLayout: React.FC = () => {
  const { user, clearSession } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <DevFixtureBanner label="City Operations Command Center — Role-Based Access Enforced (Bengaluru Metropolitan Transport & Climate Grid)" />

      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg">
              S
            </div>
            <div>
              <span className="font-extrabold text-white tracking-tight text-base">
                SKYGO <span className="text-purple-400">CityOps</span>
              </span>
              <span className="block text-[10px] text-slate-400 -mt-1">
                Smart Mobility & Fleet Command Dashboard
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5" />
            Role: {user?.role}
          </span>
          <Link
            to="/app"
            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/25"
          >
            ← Commuter App
          </Link>
        </div>
      </header>

      <div className="flex-1 flex">
        <aside
          className={`${
            mobileOpen ? "fixed inset-y-0 left-0 z-40 w-64 pt-16" : "hidden"
          } lg:block lg:w-64 bg-slate-950 border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0`}
        >
          <nav className="space-y-1">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-purple-500/20 text-purple-200 border border-purple-500/40"
                        : "text-slate-400 hover:text-white hover:bg-slate-900"
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="pt-4 mt-6 border-t border-slate-800 space-y-3">
            <div className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs">
              <p className="font-bold text-white truncate">{user?.full_name}</p>
              <p className="text-slate-400 truncate text-[11px]">{user?.email}</p>
            </div>
            <button
              onClick={() => {
                clearSession();
                navigate("/login");
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-800 text-xs font-semibold"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
