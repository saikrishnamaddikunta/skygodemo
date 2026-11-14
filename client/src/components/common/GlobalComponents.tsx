import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  ShieldAlert,
  Wrench,
  X
} from "lucide-react";
import { useAppStore } from "../../stores/useAppStore";

export const LoadingSpinner: React.FC<{ label?: string }> = ({ label = "Loading..." }) => (
  <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-300">
    <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
    <span className="text-sm font-medium">{label}</span>
  </div>
);

export const SkeletonLoader: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div
        key={i}
        className="h-24 rounded-xl bg-slate-900/80 border border-slate-800 animate-pulse p-4"
      />
    ))}
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-8 text-center">
    <Info className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
    <h3 className="text-lg font-semibold text-white">{title}</h3>
    <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  badge?: string;
  actions?: React.ReactNode;
}> = ({ title, subtitle, badge, actions }) => (
  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80 mb-6">
    <div>
      <div className="flex items-center gap-2.5">
        <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        {badge && (
          <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            {badge}
          </span>
        )}
      </div>
      {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
  </div>
);

export const DevFixtureBanner: React.FC<{ label?: string }> = ({
  label = "SKYGO Smart Mobility Grid Active: Multi-Modal Transit Sync, Fleet Optimization & Women at Night Protection Enabled"
}) => (
  <div className="bg-emerald-500/10 border-b border-emerald-500/25 px-4 py-1.5 text-xs text-emerald-200 flex items-center justify-between gap-2">
    <div className="flex items-center gap-2">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span>{label}</span>
    </div>
    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] shrink-0">
      SKYGO LIVE GRID
    </span>
  </div>
);

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto rounded-xl border p-3.5 shadow-xl backdrop-blur-md flex items-start gap-3 ${
            t.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-100"
              : t.type === "warning"
              ? "bg-amber-950/90 border-amber-500/50 text-amber-100"
              : t.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-100"
              : "bg-slate-900/95 border-slate-700 text-slate-100"
          }`}
        >
          {t.type === "error" ? (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : t.type === "warning" ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <p className="font-semibold text-sm">{t.title}</p>
            <p className="opacity-90 mt-0.5">{t.message}</p>
          </div>
          <button
            onClick={() => removeToast(t.id)}
            className="opacity-70 hover:opacity-100"
            aria-label="Close notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  danger = false,
  onConfirm,
  onCancel
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white">{title}</h3>
        <p className="text-sm text-slate-300 mt-2">{description}</p>
        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
              danger ? "bg-rose-600 hover:bg-rose-500" : "bg-emerald-600 hover:bg-emerald-500"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = useAppStore((s) => s.token);
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user } = useAppStore();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  const adminRoles = ["city_admin", "operations_manager", "safety_operator"];
  if (!adminRoles.includes(user.role)) {
    return <Navigate to="/app" replace />;
  }
  return <>{children}</>;
};

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; errorMessage: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMessage: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-2xl p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold">Application Error</h2>
            <p className="text-sm text-slate-300 mt-2">{this.state.errorMessage}</p>
            <button
              onClick={() => window.location.assign("/")}
              className="mt-5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-semibold"
            >
              Return Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
