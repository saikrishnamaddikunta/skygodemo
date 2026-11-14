import { create } from "zustand";
import { GeoPoint, RouteAlternative, RoutingPreference, TransportMode, UserRole } from "@omnitransit/shared";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  role: UserRole;
  preferred_language: string;
  preferred_currency: string;
  timezone: string;
}

export interface WalletData {
  id: string;
  user_id: string;
  balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  lifetime_co2_saved: number;
}

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
}

interface AppState {
  token: string | null;
  user: UserProfile | null;
  wallet: WalletData | null;
  saferouteEnabled: boolean;
  womenNightMode: boolean;
  origin: GeoPoint;
  originLabel: string;
  destination: GeoPoint;
  destinationLabel: string;
  routingPreference: RoutingPreference;
  preferredModes: TransportMode[];
  maxWalkingDistance: number;
  maximumBudget: number;
  routeAlternatives: RouteAlternative[];
  selectedRoute: RouteAlternative | null;
  weatherDisruptionActive: boolean;
  disruptedSegmentsDetected: string[];
  toasts: ToastMessage[];
  setSession: (token: string, user: UserProfile, wallet?: WalletData | null) => void;
  clearSession: () => void;
  setWallet: (wallet: WalletData) => void;
  setSafeRouteEnabled: (enabled: boolean) => void;
  setWomenNightMode: (enabled: boolean) => void;
  setJourneyEndpoints: (params: {
    origin?: GeoPoint;
    originLabel?: string;
    destination?: GeoPoint;
    destinationLabel?: string;
    routingPreference?: RoutingPreference;
    preferredModes?: TransportMode[];
    maxWalkingDistance?: number;
    maximumBudget?: number;
  }) => void;
  setRouteResults: (
    alternatives: RouteAlternative[],
    disruptedSegmentsDetected?: string[],
    weatherDisruptionActive?: boolean
  ) => void;
  setSelectedRoute: (route: RouteAlternative | null) => void;
  addToast: (toast: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

const storedToken = typeof window !== "undefined" ? localStorage.getItem("omnitransit_token") : null;
const storedUserRaw = typeof window !== "undefined" ? localStorage.getItem("omnitransit_user") : null;
const initialUser: UserProfile | null = storedUserRaw ? JSON.parse(storedUserRaw) : null;

export const useAppStore = create<AppState>((set) => ({
  token: storedToken,
  user: initialUser,
  wallet: null,
  saferouteEnabled: true,
  womenNightMode: true,
  origin: { latitude: 12.9767, longitude: 77.5713 },
  originLabel: "Majestic Kempegowda Interchange",
  destination: { latitude: 12.9352, longitude: 77.6245 },
  destinationLabel: "Koramangala Sony World Hub",
  routingPreference: "balanced",
  preferredModes: ["bus", "metro", "walking", "ebike"],
  maxWalkingDistance: 1500,
  maximumBudget: 150,
  routeAlternatives: [],
  selectedRoute: null,
  weatherDisruptionActive: false,
  disruptedSegmentsDetected: [],
  toasts: [],

  setSession: (token, user, wallet) => {
    localStorage.setItem("omnitransit_token", token);
    localStorage.setItem("omnitransit_user", JSON.stringify(user));
    set((state) => ({
      token,
      user,
      wallet: wallet !== undefined ? wallet : state.wallet
    }));
  },

  clearSession: () => {
    localStorage.removeItem("omnitransit_token");
    localStorage.removeItem("omnitransit_user");
    set({
      token: null,
      user: null,
      wallet: null,
      routeAlternatives: [],
      selectedRoute: null
    });
  },

  setWallet: (wallet) => set({ wallet }),

  setSafeRouteEnabled: (enabled) => set({ saferouteEnabled: enabled }),

  setWomenNightMode: (enabled) =>
    set((state) => ({
      womenNightMode: enabled,
      saferouteEnabled: enabled ? true : state.saferouteEnabled
    })),

  setJourneyEndpoints: (params) =>
    set((state) => ({
      origin: params.origin ?? state.origin,
      originLabel: params.originLabel ?? state.originLabel,
      destination: params.destination ?? state.destination,
      destinationLabel: params.destinationLabel ?? state.destinationLabel,
      routingPreference: params.routingPreference ?? state.routingPreference,
      preferredModes: params.preferredModes ?? state.preferredModes,
      maxWalkingDistance: params.maxWalkingDistance ?? state.maxWalkingDistance,
      maximumBudget: params.maximumBudget ?? state.maximumBudget
    })),

  setRouteResults: (alternatives, disrupted = [], weatherDisruptionActive = false) =>
    set({
      routeAlternatives: alternatives,
      selectedRoute: alternatives[0] || null,
      disruptedSegmentsDetected: disrupted,
      weatherDisruptionActive
    }),

  setSelectedRoute: (route) => set({ selectedRoute: route }),

  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }]
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 4800);
  },

  removeToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
}));
