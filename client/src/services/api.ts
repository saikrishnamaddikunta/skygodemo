import { useAppStore } from "../stores/useAppStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = useAppStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const payload = await response.json().catch(() => ({
    success: false,
    error: { message: `HTTP Error ${response.status}` }
  }));

  if (!response.ok || payload.success === false) {
    throw new Error(payload?.error?.message || payload?.message || "Request failed");
  }

  return payload.data as T;
}
