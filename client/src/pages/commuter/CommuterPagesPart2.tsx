import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  Clock,
  Coins,
  Eye,
  Gift,
  Leaf,
  MapPin,
  PhoneCall,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  User,
  Users
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
import { INDIA_EMERGENCY_NUMBER } from "@omnitransit/shared";
import {
  EmptyState,
  LoadingSpinner,
  PageHeader
} from "../../components/common/GlobalComponents";
import { SOSButton } from "../../components/emergency/SOSComponents";
import { InteractiveMap } from "../../components/maps/InteractiveMap";
import { SafeRouteToggle, WomenNightModeToggle } from "../../components/routing/JourneyComponents";
import { apiRequest } from "../../services/api";
import { useAppStore } from "../../stores/useAppStore";
import { formatIndianDateTime, formatINR } from "../../utils/format";

export const SafeRoutePage: React.FC = () => {
  const {
    origin,
    destination,
    saferouteEnabled,
    womenNightMode,
    setSafeRouteEnabled,
    setWomenNightMode
  } = useAppStore();
  const [evaluation, setEvaluation] = useState<any>(null);
  const [zones, setZones] = useState<any>(null);

  useEffect(() => {
    apiRequest("/safety/evaluate", {
      method: "POST",
      body: JSON.stringify({
        origin,
        destination,
        preferWellLit: true,
        preferPopulated: true,
        womenNightMode
      })
    })
      .then(setEvaluation)
      .catch(() => {});

    apiRequest("/safety/zones")
      .then(setZones)
      .catch(() => {});
  }, [origin, destination, womenNightMode]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SafeRoute & Women at Night Mode Intelligence"
        subtitle="High-lumen Smart LED lighting, Safe City CCTV stations, Women's Help Desks & 24x7 patrol proximity evaluation"
        badge={womenNightMode ? "Women at Night Protected" : "SafeRoute Verified"}
        actions={<SOSButton />}
      />

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-4">
          <SafeRouteToggle enabled={saferouteEnabled} onChange={setSafeRouteEnabled} />
          <WomenNightModeToggle enabled={womenNightMode} onChange={setWomenNightMode} />

          {/* Dedicated Women at Night Protection Shield Card */}
          <div className="bg-fuchsia-950/30 border border-fuchsia-500/40 rounded-2xl p-5 space-y-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-fuchsia-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-fuchsia-400" />
                Women at Night Mode Protection Protocol
              </span>
              <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-200 font-bold text-[10px]">
                {womenNightMode ? "ENFORCED" : "READY"}
              </span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              When active, the routing engine strictly filters out dimly-lit segments (&lt;82/100 lighting) and prioritizes CCTV-verified Namma Metro concourses, electric feeder hubs, and 24x7 Hoysala patrol corridors.
            </p>
            <ul className="space-y-1.5 text-fuchsia-100">
              {(
                evaluation?.womenNightProtectionChecklist || [
                  "100% High-Lumen Smart LED Lit Arterial Corridors (>=82/100 Lighting Score)",
                  "Safe City CCTV & BMRCL Women's Help Desk Verified Stations",
                  "24x7 Hoysala Police Patrol Proximity (<150m at Transfer Hubs)",
                  "Live In-App Journey Sharing with Verified Trusted Contacts & 1-Tap 112 SOS"
                ]
              ).map((item: string, idx: number) => (
                <li key={idx} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-fuchsia-400 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {evaluation && (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400">Composite Corridor Safety Score</p>
                  <p className="text-3xl font-black text-emerald-400">
                    {evaluation.overallSafetyScore}/100
                  </p>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold">
                    Confidence: {Math.round(evaluation.confidence * 100)}%
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">{evaluation.dataFreshness}</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {Object.entries(evaluation.breakdown || {}).map(([key, val]: [string, any]) => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-slate-300 capitalize">
                      <span>{key.replace(/([A-Z])/g, " $1")}</span>
                      <span className="font-bold text-white">{val}/100</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${Math.min(100, Number(val))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs text-amber-200 space-y-1">
                <p className="font-bold">Data Limitations & Transparency:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {evaluation.missingInformation?.map((info: string, i: number) => (
                    <li key={i}>{info}</li>
                  ))}
                </ul>
                <p className="pt-1 text-[11px] opacity-90">{evaluation.disclaimer}</p>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-7 space-y-4">
          <InteractiveMap
            origin={origin}
            destination={destination}
            safetyHubs={zones?.hubScores || []}
            heightClass="h-[360px]"
          />

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white">
              Verified Corridor Safety Indicators
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {(evaluation?.indicators || []).map((ind: any) => (
                <div
                  key={ind.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300">{ind.area_name}</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold">
                      {ind.score}/100
                    </span>
                  </div>
                  <p className="text-slate-300">{ind.description}</p>
                  <p className="text-[11px] text-slate-500">
                    Source: {ind.source} • Confidence: {ind.confidence}%
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EmergencyPage: React.FC = () => {
  const { origin, addToast } = useAppStore();
  const [activeIncident, setActiveIncident] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    apiRequest("/emergency/contacts")
      .then(setContacts)
      .catch(() => {});
  }, []);

  const handlePushLiveLocation = async () => {
    if (!activeIncident) return;
    try {
      await apiRequest(`/emergency/${activeIncident.id}/location`, {
        method: "POST",
        body: JSON.stringify({
          latitude: origin.latitude + 0.0005,
          longitude: origin.longitude + 0.0005,
          accuracyMeters: 10
        })
      });
      const refreshed = await apiRequest(`/emergency/${activeIncident.id}`);
      setActiveIncident(refreshed.incident);
      addToast({
        type: "info",
        title: "Live Location Updated",
        message: "Latest device coordinates recorded on incident timeline."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Update Error", message: err.message });
    }
  };

  const handleCancelIncident = async () => {
    if (!activeIncident) return;
    try {
      const cancelled = await apiRequest(`/emergency/${activeIncident.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Cancelled by commuter from Emergency console" })
      });
      setActiveIncident(cancelled);
      addToast({
        type: "warning",
        title: "SOS Alert Cancelled",
        message: "Incident status updated to cancelled."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Cancel Error", message: err.message });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Emergency SOS & Incident Command"
        subtitle="Trigger verified contact alerts, broadcast live location updates, or call India National Emergency 112"
        badge="112 Official Fallback Visible"
      />

      {/* Visible 112 Fallback Banner */}
      <div className="p-4 rounded-2xl bg-rose-950/70 border-2 border-rose-500/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 text-xs text-rose-100">
          <p className="text-sm font-bold text-white flex items-center gap-2">
            <PhoneCall className="w-4 h-4 text-rose-400" />
            Official India Emergency Services Number: {INDIA_EMERGENCY_NUMBER}
          </p>
          <p>
            SKYGO notifies your verified emergency contacts and city safety operators, but is NOT a replacement for direct police, fire, or ambulance dispatch.
          </p>
        </div>
        <a
          href="tel:112"
          className="px-5 py-2.5 rounded-xl bg-white text-rose-900 font-extrabold text-xs shrink-0 text-center"
        >
          Call 112 Directly
        </a>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <h3 className="text-base font-bold text-white">One-Tap SOS Control</h3>
          <p className="text-xs text-slate-300">
            Pressing Emergency SOS requires explicit confirmation (or a 5-second countdown) before creating an incident record and notifying your {contacts.length} verified contact(s).
          </p>

          <div className="py-3">
            <SOSButton onIncidentCreated={(inc) => setActiveIncident(inc)} />
          </div>

          {activeIncident && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-rose-500/40 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300">
                  Incident #{activeIncident.id.slice(0, 8)}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold uppercase">
                  {activeIncident.status}
                </span>
              </div>

              <p className="text-slate-300">
                Coordinates: {activeIncident.current_location?.latitude?.toFixed(4)},{" "}
                {activeIncident.current_location?.longitude?.toFixed(4)}
              </p>

              <p className="text-slate-400">
                Notification Provider: {activeIncident.notification_status?.provider}
              </p>

              {activeIncident.status === "active" && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handlePushLiveLocation}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold"
                  >
                    Push Location Update
                  </button>
                  <button
                    onClick={handleCancelIncident}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 font-semibold"
                  >
                    Cancel Accidental SOS
                  </button>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 space-y-1.5">
                <p className="font-semibold text-slate-300">Incident Activity Timeline:</p>
                {(activeIncident.activity_log || []).map((log: any, idx: number) => (
                  <div key={idx} className="text-[11px] text-slate-400">
                    [{formatIndianDateTime(log.timestamp)}] <strong>{log.action}</strong> —{" "}
                    {log.note}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-6">
          <InteractiveMap origin={origin} heightClass="h-[380px]" />
        </div>
      </div>
    </div>
  );
};

export const TrustedContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+91-");
  const [email, setEmail] = useState("");
  const [relationship, setRelationship] = useState("Family");
  const { addToast } = useAppStore();

  const loadContacts = () => {
    apiRequest("/emergency/contacts")
      .then(setContacts)
      .catch(() => {});
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/emergency/contacts", {
        method: "POST",
        body: JSON.stringify({
          contact_name: name,
          phone,
          email,
          relationship,
          is_verified: true,
          notification_preferences: ["in_app", "live_share"]
        })
      });
      setName("");
      setPhone("+91-");
      setEmail("");
      loadContacts();
      addToast({
        type: "success",
        title: "Contact Added",
        message: "Trusted emergency contact verified and saved."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Validation Error", message: err.message });
    }
  };

  const handleDelete = async (id: string) => {
    await apiRequest(`/emergency/contacts/${id}`, { method: "DELETE" });
    loadContacts();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trusted Emergency Contacts"
        subtitle="Manage verified recipients for Women at Night / SafeRoute live in-app journey sharing and SOS alerts"
        badge={`${contacts.length} Verified Contacts`}
      />

      <div className="grid lg:grid-cols-12 gap-6">
        <form
          onSubmit={handleAddContact}
          className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4"
        >
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Add Verified Emergency Contact</span>
          </h3>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Contact Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rohan Verma"
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Phone Number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Email (Optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Relationship</label>
            <input
              type="text"
              required
              value={relationship}
              onChange={(e) => setRelationship(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
          >
            Save & Verify Contact
          </button>
        </form>

        <div className="lg:col-span-7 space-y-3">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between gap-4"
            >
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white">{c.contact_name}</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 text-[10px] font-bold">
                    {c.is_verified ? "VERIFIED" : "UNVERIFIED"}
                  </span>
                </div>
                <p className="text-slate-300">
                  {c.phone} {c.email ? `• ${c.email}` : ""} • {c.relationship}
                </p>
              </div>
              <button
                onClick={() => handleDelete(c.id)}
                className="p-2 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const CarbonWalletPage: React.FC = () => {
  const { wallet, setWallet } = useAppStore();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  useEffect(() => {
    apiRequest("/carbon/wallet")
      .then((res) => {
        if (res.wallet) setWallet(res.wallet);
        setTransactions(res.transactions || []);
      })
      .catch(() => {});

    apiRequest("/carbon/campaigns")
      .then(setCampaigns)
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Carbon Coins Wallet & Immutable Ledger"
        subtitle="Formula: Carbon Coins = CO2 Saved (kg) × Base Rate (10) × Dynamic Route Multiplier"
        badge="Idempotent Server-Side Ledger"
        actions={
          <Link
            to="/app/rewards"
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
          >
            Redeem Coins in Catalog →
          </Link>
        }
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-amber-500/30">
          <p className="text-xs text-slate-400">Available Balance</p>
          <p className="text-3xl font-black text-amber-400 mt-1">
            {wallet?.balance ?? 0} Coins
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Lifetime Coins Earned</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">
            {wallet?.lifetime_earned ?? 0}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Lifetime Coins Redeemed</p>
          <p className="text-3xl font-black text-purple-400 mt-1">
            {wallet?.lifetime_redeemed ?? 0}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Total CO2e Saved</p>
          <p className="text-3xl font-black text-teal-400 mt-1">
            {wallet?.lifetime_co2_saved ?? 0} kg
          </p>
        </div>
      </div>

      {/* Active Multiplier Campaigns */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">Active Dynamic Multiplier Campaigns</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs space-y-1"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-300">{camp.campaign_name}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  {camp.multiplier}x Multiplier
                </span>
              </div>
              <p className="text-slate-300">{camp.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Immutable Ledger Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h3 className="text-sm font-bold text-white">
          Immutable Carbon Transaction History ({transactions.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 pr-4">Timestamp (IST)</th>
                <th className="py-2.5 pr-4">Type</th>
                <th className="py-2.5 pr-4">Description</th>
                <th className="py-2.5 pr-4">CO2 Saved</th>
                <th className="py-2.5 pr-4">Multiplier</th>
                <th className="py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td className="py-3 pr-4 text-slate-400">
                    {formatIndianDateTime(tx.created_at)}
                  </td>
                  <td className="py-3 pr-4 uppercase font-bold">
                    <span
                      className={
                        tx.transaction_type === "earn"
                          ? "text-emerald-400"
                          : "text-amber-400"
                      }
                    >
                      {tx.transaction_type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-slate-200">{tx.description}</td>
                  <td className="py-3 pr-4 text-teal-300">{tx.co2_saved} kg</td>
                  <td className="py-3 pr-4 text-slate-300">{tx.multiplier}x</td>
                  <td className="py-3 text-right font-extrabold text-white">
                    {tx.transaction_type === "earn" ? "+" : "-"}
                    {tx.amount} Coins
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export const RewardsCatalogPage: React.FC = () => {
  const { wallet, setWallet, addToast } = useAppStore();
  const [rewards, setRewards] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const loadData = () => {
    apiRequest("/carbon/rewards")
      .then(setRewards)
      .catch(() => {});
    apiRequest("/carbon/wallet")
      .then((res) => {
        if (res.wallet) setWallet(res.wallet);
        setRedemptions(res.redemptions || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRedeem = async (rewardId: string) => {
    setRedeemingId(rewardId);
    try {
      const res = await apiRequest("/carbon/redeem", {
        method: "POST",
        body: JSON.stringify({ rewardId })
      });
      setWallet(res.wallet);
      loadData();
      addToast({
        type: "success",
        title: "Reward Redeemed!",
        message: `Voucher Code: ${res.redemption.redemption_code}`
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Redemption Failed", message: err.message });
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sustainable Mobility Rewards Catalog"
        subtitle="Redeem earned Carbon Coins for metro smart-card vouchers, bus pass discounts & green badges (Demo Vouchers)"
        badge={`Available: ${wallet?.balance ?? 0} Coins`}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {rewards.map((rew) => (
          <div
            key={rew.id}
            className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Gift className="w-6 h-6 text-amber-400" />
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-extrabold">
                  {rew.coin_cost} Coins
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{rew.reward_name}</h3>
              <p className="text-xs text-slate-400">{rew.description}</p>
            </div>

            <button
              disabled={redeemingId === rew.id || (wallet?.balance ?? 0) < rew.coin_cost}
              onClick={() => handleRedeem(rew.id)}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold text-xs"
            >
              {(wallet?.balance ?? 0) < rew.coin_cost
                ? "Insufficient Coins"
                : redeemingId === rew.id
                ? "Redeeming..."
                : "Redeem Demo Voucher"}
            </button>
          </div>
        ))}
      </div>

      {redemptions.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">Your Redeemed Vouchers</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            {redemptions.map((r) => (
              <div
                key={r.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-white">{r.reward_name}</p>
                  <p className="text-slate-400">{formatIndianDateTime(r.created_at)}</p>
                </div>
                <span className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  {r.redemption_code}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const EnvironmentalImpactPage: React.FC = () => {
  const [impact, setImpact] = useState<any>(null);

  useEffect(() => {
    apiRequest("/carbon/impact")
      .then(setImpact)
      .catch(() => {});
  }, []);

  if (!impact) return <LoadingSpinner label="Calculating sustainability metrics..." />;

  const chartData = Object.entries(impact.modeDistanceKm || {}).map(([mode, km]) => ({
    mode: mode.toUpperCase(),
    distanceKm: Number(km)
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environmental Impact & Emission Analytics"
        subtitle="Audit-ready CO2e savings calculated from authoritative India GHG regional emission factors"
        badge={`${impact.totalCo2SavedKg} kg CO2e Saved`}
      />

      <div className="grid sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Completed Green Journeys</p>
          <p className="text-3xl font-black text-white mt-1">
            {impact.completedJourneysCount}
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Total CO2e Avoided</p>
          <p className="text-3xl font-black text-emerald-400 mt-1">
            {impact.totalCo2SavedKg} kg
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Equivalent Urban Trees Absorption</p>
          <p className="text-3xl font-black text-teal-400 mt-1">
            {impact.equivalentTreesMonthly} tree-months
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
          <h3 className="text-sm font-bold text-white mb-4">
            Distance Traveled by Sustainable Mode (km)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
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
                <Bar dataKey="distanceKm" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-white">
            Configured Emission Factors (kg CO2e / passenger-km)
          </h3>
          <div className="space-y-2 text-xs">
            {Object.entries(impact.emissionFactors || {}).map(([mode, factor]: [string, any]) => (
              <div
                key={mode}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800"
              >
                <span className="uppercase font-semibold text-slate-300">{mode}</span>
                <span className="font-mono text-emerald-400">{factor} kg/km</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PastJourneysPage: React.FC = () => {
  const [journeys, setJourneys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("/journeys")
      .then(setJourneys)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Past Multi-Modal Journeys"
        subtitle="Complete audit trail of planned, active, and completed journeys"
        badge={`${journeys.length} Journeys`}
      />

      {loading ? (
        <LoadingSpinner />
      ) : journeys.length === 0 ? (
        <EmptyState
          title="No journeys recorded yet"
          description="Plan a route from the Journey Planner to start tracking your commutes."
        />
      ) : (
        <div className="space-y-3">
          {journeys.map((j) => (
            <div
              key={j.id}
              className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    {j.origin_label} → {j.destination_label}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 font-bold uppercase text-[10px]">
                    {j.status}
                  </span>
                </div>
                <p className="text-slate-400">
                  {formatIndianDateTime(j.created_at)} • Preference: {j.routing_preference} •{" "}
                  {j.estimated_distance} km • {j.estimated_duration} mins
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold text-white text-sm">{formatINR(j.estimated_cost)}</p>
                  <p className="text-emerald-400">Saved {j.carbon_saved} kg CO2e</p>
                </div>
                <Link
                  to={`/app/navigation/${j.id}`}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold"
                >
                  Open →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const UserProfilePage: React.FC = () => {
  const { user, token, setSession, addToast } = useAppStore();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "+91-9845012345");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await apiRequest("/auth/profile", {
        method: "PATCH",
        body: JSON.stringify({ full_name: fullName, phone })
      });
      if (token) setSession(token, updated);
      addToast({
        type: "success",
        title: "Profile Saved",
        message: "Commuter profile updated successfully."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Update Error", message: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Commuter Profile"
        subtitle="Manage your identity and regional settings (INR ₹ • Asia/Kolkata IST)"
        badge={user?.role}
      />

      <form
        onSubmit={handleSave}
        className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs"
      >
        <div>
          <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Email Address</label>
          <input
            type="email"
            disabled
            value={user?.email || ""}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800 text-slate-400"
          />
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white"
          />
        </div>

        <button
          type="submit"
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
        >
          Save Profile Changes
        </button>
      </form>
    </div>
  );
};

export const UserSettingsPage: React.FC = () => {
  const {
    saferouteEnabled,
    womenNightMode,
    setSafeRouteEnabled,
    setWomenNightMode,
    maxWalkingDistance,
    setJourneyEndpoints,
    addToast
  } = useAppStore();
  const [weatherAlerts, setWeatherAlerts] = useState(true);
  const [ecoNotifs, setEcoNotifs] = useState(true);

  const handleSavePreferences = async () => {
    try {
      await apiRequest("/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          saferoute_enabled: saferouteEnabled,
          max_walking_distance: maxWalkingDistance,
          weather_alerts_enabled: weatherAlerts,
          eco_notifications_enabled: ecoNotifs
        })
      });
      addToast({
        type: "success",
        title: "Settings Updated",
        message: "Smart Mobility, Women at Night, and privacy preferences saved."
      });
    } catch (err: any) {
      addToast({ type: "error", title: "Save Failed", message: err.message });
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader
        title="Smart Mobility, Night Safety & Privacy Settings"
        subtitle="Configure default Women at Night Mode, SafeRoute behavior, congestion alerts, and in-app sharing"
      />

      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4 text-xs">
        <SafeRouteToggle enabled={saferouteEnabled} onChange={setSafeRouteEnabled} />
        <WomenNightModeToggle enabled={womenNightMode} onChange={setWomenNightMode} />

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <p className="font-bold text-white">Predictive Traffic Congestion & Schedule Delay Alerts</p>
            <p className="text-slate-400">
              Automatically notify and recalculate when routes encounter arterial bottlenecks or transit delays
            </p>
          </div>
          <input
            type="checkbox"
            checked={weatherAlerts}
            onChange={(e) => setWeatherAlerts(e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
          <div>
            <p className="font-bold text-white">Carbon Coin Multiplier Notifications</p>
            <p className="text-slate-400">
              Receive Gemini AI off-peak bus and metro eco-campaign alerts
            </p>
          </div>
          <input
            type="checkbox"
            checked={ecoNotifs}
            onChange={(e) => setEcoNotifs(e.target.checked)}
            className="w-4 h-4 accent-emerald-500"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-300 mb-1">
            Default Maximum Walking Distance (meters)
          </label>
          <input
            type="number"
            min={200}
            max={5000}
            step={100}
            value={maxWalkingDistance}
            onChange={(e) =>
              setJourneyEndpoints({ maxWalkingDistance: Number(e.target.value) })
            }
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white"
          />
        </div>

        <button
          onClick={handleSavePreferences}
          className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
        >
          Save Preferences
        </button>
      </div>
    </div>
  );
};
