import { io, Socket } from "socket.io-client";
import { useAppStore } from "../stores/useAppStore";

let socket: Socket | null = null;

export function connectRealtimeSocket(userId?: string, isAdmin?: boolean): Socket {
  if (!socket) {
    let url = window.location.origin;
    if (import.meta.env.VITE_API_BASE_URL && import.meta.env.VITE_API_BASE_URL.startsWith("http")) {
      try {
        url = new URL(import.meta.env.VITE_API_BASE_URL).origin;
      } catch {
        url = window.location.origin;
      }
    }

    socket = io(url, {
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1500
    });

    socket.on("wallet:updated", (data: any) => {
      if (data?.wallet) {
        useAppStore.getState().setWallet(data.wallet);
        useAppStore.getState().addToast({
          type: "success",
          title: "Carbon Wallet Updated",
          message: `New Balance: ${data.wallet.balance} Carbon Coins`
        });
      }
    });

    socket.on("weather:updated", (data: any) => {
      useAppStore.getState().addToast({
        type: data?.disruption_active ? "warning" : "info",
        title: data?.disruption_active ? "Weather Disruption Alert" : "Weather Cleared",
        message: data?.condition_text || "Weather intelligence updated"
      });
    });

    socket.on("emergency:sos", (incident: any) => {
      useAppStore.getState().addToast({
        type: "error",
        title: "Emergency SOS Alert",
        message: `Incident #${incident?.id?.slice(0, 8)} active at (${incident?.current_location?.latitude?.toFixed(3)}, ${incident?.current_location?.longitude?.toFixed(3)})`
      });
    });
  }

  if (userId) {
    socket.emit("join:user", userId);
  }
  if (isAdmin) {
    socket.emit("join:admin");
  }

  return socket;
}
