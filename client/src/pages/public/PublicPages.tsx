import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Bus,
  CloudLightning,
  Coins,
  Leaf,
  Lock,
  Mail,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  TrainFront,
  UserCheck
} from "lucide-react";
import { DevFixtureBanner } from "../../components/common/GlobalComponents";
import { apiRequest } from "../../services/api";
import { useAppStore } from "../../stores/useAppStore";

export const LandingPage: React.FC = () => {
  const { token, user } = useAppStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <DevFixtureBanner />

      <header className="max-w-7xl w-full mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-black text-slate-950 text-xl">
            S
          </div>
          <div>
            <span className="font-extrabold text-lg text-white">
              SKY<span className="text-emerald-400">GO</span>
            </span>
            <span className="block text-[11px] text-slate-400 -mt-1">
              AI for Smart Mobility • Multi-Modal Efficiency • Fleet Optimization • Women at Night Safety
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {token ? (
            <Link
              to={user?.role === "commuter" ? "/app" : "/admin"}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <span>Open Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl w-full mx-auto px-6 py-12 lg:py-20 grid lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Theme: AI for Smart Mobility • Unified Multi-Modal & Fleet Optimization</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black text-white leading-tight tracking-tight">
            Faster, Safer & Synchronized{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              AI Smart Mobility
            </span>
          </h1>

          <p className="text-base text-slate-300 max-w-2xl leading-relaxed">
            Replace disconnected transit tools and static schedules with real-time AI optimization. SKYGO synchronizes Namma Metro, BMTC public buses, and Yulu micro-mobility to eliminate transfer delays, balance fleet occupancy, predict arterial bottlenecks, and protect commuters with our dedicated <strong>Women at Night Mode</strong>.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              to={token ? "/app/plan" : "/register"}
              className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25 flex items-center gap-2"
            >
              <span>Optimize Your Multi-Modal Journey</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold text-sm"
            >
              Try Demo Accounts (Commuter / City Ops)
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-800">
            <div>
              <p className="text-2xl font-extrabold text-emerald-400">5 AI Profiles</p>
              <p className="text-xs text-slate-400">Fastest, Cheapest, Safest, Eco, Balanced</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-fuchsia-400">Women @ Night</p>
              <p className="text-xs text-slate-400">Lit Corridors, CCTV & 24x7 Patrols</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-sky-400">Fleet Sync</p>
              <p className="text-xs text-slate-400">Predictive Congestion Rerouting</p>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-amber-400">1.75x Coins</p>
              <p className="text-xs text-slate-400">Off-Peak Demand Balancing</p>
            </div>
          </div>
        </div>

        {/* Example Journey Preview Card */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Sample Unified Multi-Modal Route
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold">
              Balanced AI Route
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">1. Walk 400m to Majestic Metro</span>
              <span className="text-slate-400">5 mins • ₹0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-purple-300 font-semibold flex items-center gap-1.5">
                <TrainFront className="w-3.5 h-3.5" /> 2. Namma Metro Purple Line → Indiranagar
              </span>
              <span className="text-slate-300">15 mins • ₹35</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-blue-300 font-semibold flex items-center gap-1.5">
                <Bus className="w-3.5 h-3.5" /> 3. BMTC Route 12 Green Feeder → Domlur
              </span>
              <span className="text-slate-300">10 mins • ₹15</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-emerald-300 font-semibold">
                4. Yulu E-Bike 800m → Koramangala Hub
              </span>
              <span className="text-slate-300">4 mins • ₹10</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400">Total Cost</p>
              <p className="text-base font-bold text-white">₹60</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400">Safety Score</p>
              <p className="text-base font-bold text-emerald-400">92/100</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
              <p className="text-slate-400">Carbon Coins</p>
              <p className="text-base font-bold text-amber-400">+37.5</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="max-w-7xl w-full mx-auto px-6 py-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <TrainFront className="w-8 h-8 text-purple-400" />
          <h3 className="text-base font-bold text-white">Multi-Modal Route & Schedule Sync</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Dijkstra & A* graph optimization unifies Metro, public buses, e-bikes, and walking to eliminate transfer delays and static planning inefficiencies.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <ShieldCheck className="w-8 h-8 text-fuchsia-400" />
          <h3 className="text-base font-bold text-white">Women at Night Mode & SafeRoute AI</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Dedicated night protection enforcing high-lumen Smart LED corridors, Safe City CCTV stations, Women&apos;s Help Desks, 24x7 police patrol proximity, and in-app live sharing.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <CloudLightning className="w-8 h-8 text-sky-400" />
          <h3 className="text-base font-bold text-white">Predictive Disruption & Fleet Efficiency</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Real-time bottleneck detection and fleet utilization analytics dynamically reroute commuters around congested arterials onto high-capacity transit lines.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
          <Coins className="w-8 h-8 text-amber-400" />
          <h3 className="text-base font-bold text-white">Demand-Balancing Carbon Incentives</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Dynamic multipliers reward commuters for choosing underutilized off-peak electric buses and micro-mobility, improving fleet load factors city-wide.
          </p>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-900 py-6 px-6 text-center text-xs text-slate-500">
        SKYGO • AI for Smart Mobility & Urban Transit Efficiency (INR ₹ • Asia/Kolkata IST • National Emergency Number: 112)
      </footer>
    </div>
  );
};

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("commuter@omnitransit.in");
  const [password, setPassword] = useState("Commuter@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setSession, addToast } = useAppStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      setSession(data.token, data.user, data.wallet);
      addToast({
        type: "success",
        title: "Welcome back!",
        message: `Signed in as ${data.user.full_name} (${data.user.role})`
      });
      navigate(data.user.role === "commuter" ? "/app" : "/admin");
    } catch (err: any) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickRole = (roleEmail: string, rolePass: string) => {
    setEmail(roleEmail);
    setPassword(rolePass);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-1 font-black text-xl text-white">
            SKY<span className="text-emerald-400">GO</span>
          </Link>
          <h1 className="text-lg font-bold mt-2">Sign In to Your Mobility Account</h1>
          <p className="text-xs text-slate-400 mt-1">
            Access multi-modal routing, SafeRoute, Carbon Wallet, or City Operations
          </p>
        </div>

        {/* One-Click Demo Credentials Selector */}
        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Demo Role Selector (Pre-Seeded Accounts)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillQuickRole("commuter@omnitransit.in", "Commuter@123")}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold text-left"
            >
              Commuter (Aarav)
            </button>
            <button
              type="button"
              onClick={() => fillQuickRole("admin@omnitransit.in", "Admin@123")}
              className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-xs font-semibold text-left"
            >
              City Admin (Dr. Rao)
            </button>
            <button
              type="button"
              onClick={() => fillQuickRole("ops@omnitransit.in", "Ops@12345")}
              className="px-2.5 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold text-left"
            >
              Operations Manager
            </button>
            <button
              type="button"
              onClick={() => fillQuickRole("safety@omnitransit.in", "Safety@123")}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-xs font-semibold text-left"
            >
              Safety Operator
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <Link to="/forgot-password" className="text-emerald-400 hover:underline">
              Forgot password?
            </Link>
            <Link to="/register" className="text-slate-300 hover:text-white">
              Create account →
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/25"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export const RegisterPage: React.FC = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91-");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setSession, addToast } = useAppStore();
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName, email, phone, password })
      });
      setSession(data.token, data.user, data.wallet);
      addToast({
        type: "success",
        title: "Account Provisioned",
        message: "Welcome to SKYGO! Your Carbon Wallet is active."
      });
      navigate("/app");
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-5">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-1 font-black text-xl text-white">
            SKY<span className="text-emerald-400">GO</span>
          </Link>
          <h1 className="text-lg font-bold mt-2">Create Your Commuter Account</h1>
          <p className="text-xs text-slate-400 mt-1">
            Automatically provisions your SafeRoute profile and Carbon Coins wallet
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-xs text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              minLength={2}
              placeholder="e.g. Ananya Verma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="ananya@example.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number (India)</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Password (min 6 characters)
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm"
          >
            {loading ? "Creating Account..." : "Register & Provision Carbon Wallet"}
          </button>

          <p className="text-center text-xs text-slate-400">
            Already registered?{" "}
            <Link to="/login" className="text-emerald-400 hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiRequest("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email })
    });
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h1 className="text-lg font-bold">Password Recovery</h1>
        {sent ? (
          <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-xs text-emerald-200 space-y-2">
            <p>Recovery instructions have been queued for {email}.</p>
            <Link to="/login" className="inline-block text-emerald-400 font-bold underline">
              Return to Sign In
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
            >
              Send Recovery Link
            </button>
            <Link to="/login" className="block text-center text-xs text-slate-400 hover:text-white">
              Back to Sign In
            </Link>
          </form>
        )}
      </div>
    </div>
  );
};

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const token = useAppStore((s) => s.token);

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate(token ? "/app" : "/login", { replace: true });
    }, 800);
    return () => clearTimeout(timer);
  }, [token]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center gap-3">
      <UserCheck className="w-10 h-10 text-emerald-400 animate-bounce" />
      <p className="text-sm font-semibold">Completing Supabase Authentication Callback...</p>
    </div>
  );
};
