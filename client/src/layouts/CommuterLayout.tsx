import React, { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Award,
  Clock,
  Coins,
  Compass,
  Gift,
  LayoutDashboard,
  Leaf,
  LogOut,
  MapPin,
  Menu,
  PhoneCall,
  Settings,
  ShieldAlert,
  ShieldCheck,
  User,
  Users,
  X
} from "lucide-react";
import { DevFixtureBanner } from "../components/common/GlobalComponents";
import { SOSButton } from "../components/emergency/SOSComponents";
import { apiRequest } from "../services/api";
import { connectRealtimeSocket } from "../services/socket";
import { useAppStore } from "../stores/useAppStore";

const commuterNavItems = [
  { to: "/app", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/app/plan", label: "Plan Journey", icon: Compass },
  { to: "/app/routes", label: "Compare Routes", icon: MapPin },
  { to: "/app/saferoute", label: "Women @ Night / SafeRoute", icon: ShieldCheck },
  { to: "/app/emergency", label: "Emergency SOS", icon: ShieldAlert },
  { to: "/app/contacts", label: "Trusted Contacts", icon: Users },
  { to: "/app/wallet", label: "Carbon Wallet", icon: Coins },
  { to: "/app/rewards", label: "Rewards Catalog", icon: Gift },
  { to: "/app/impact", label: "Eco Impact", icon: Leaf },
  { to: "/app/history", label: "Past Journeys", icon: Clock },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/settings", label: "Settings", icon: Settings }
];

export const CommuterLayout: React.FC = () => {
  const { user, wallet, setWallet, clearSession } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.id) {
      connectRealtimeSocket(user.id, user.role !== "commuter");
      apiRequest("/carbon/wallet")
        .then((res) => {
          if (res?.wallet) setWallet(res.wallet);
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const isAdminUser =
    user && ["city_admin", "operations_manager", "safety_operator"].includes(user.role);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <DevFixtureBanner />

      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800 px-4 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link to="/app" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-black text-slate-950 text-lg">
              S
            </div>
            <div>
              <span className="font-extrabold text-white tracking-tight text-base">
                SKY<span className="text-emerald-400">GO</span>
              </span>
              <span className="block text-[10px] text-slate-400 -mt-1">
                AI Smart Mobility • Bengaluru Grid • IST
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/app/wallet"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>{wallet?.balance ?? 0} Carbon Coins</span>
          </Link>

          <a
            href="tel:112"
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-rose-300 font-semibold"
          >
            <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
            <span>India Emergency: 112</span>
          </a>

          <SOSButton />

          {isAdminUser && (
            <Link
              to="/admin"
              className="px-3 py-1.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-200 text-xs font-semibold hover:bg-purple-500/30"
            >
              City Ops Portal →
            </Link>
          )}
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside
          className={`${
            mobileOpen ? "fixed inset-y-0 left-0 z-40 w-64 pt-16" : "hidden"
          } lg:block lg:w-64 bg-slate-950 border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0`}
        >
          <nav className="space-y-1">
            {commuterNavItems.map((item) => {
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
                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
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
            <div className="px-3 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
              <p className="font-bold text-white truncate">{user?.full_name}</p>
              <p className="text-slate-400 truncate text-[11px]">{user?.email}</p>
              <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-semibold uppercase">
                <Award className="w-3 h-3" /> {user?.role}
              </span>
            </div>

            <button
              onClick={() => {
                clearSession();
                navigate("/login");
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-800 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
