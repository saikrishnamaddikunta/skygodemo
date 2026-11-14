import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  AdminRoute,
  ErrorBoundary,
  ProtectedRoute,
  ToastContainer
} from "./components/common/GlobalComponents";
import { AdminLayout } from "./layouts/AdminLayout";
import { CommuterLayout } from "./layouts/CommuterLayout";
import {
  AdminAuditLogsPage,
  AdminCampaignsPage,
  AdminCarbonPage,
  AdminFleetPage,
  AdminFloodZonesPage,
  AdminIncidentsPage,
  AdminMapPage,
  AdminOverviewPage,
  AdminRoutesPage,
  AdminSafetyPage,
  AdminUsersPage,
  AdminWeatherPage
} from "./pages/admin/AdminPages";
import {
  ActiveNavigationPage,
  CommuterDashboardPage,
  JourneyPlannerPage,
  RouteComparisonPage
} from "./pages/commuter/CommuterPagesPart1";
import {
  CarbonWalletPage,
  EmergencyPage,
  EnvironmentalImpactPage,
  PastJourneysPage,
  RewardsCatalogPage,
  SafeRoutePage,
  TrustedContactsPage,
  UserProfilePage,
  UserSettingsPage
} from "./pages/commuter/CommuterPagesPart2";
import {
  AuthCallbackPage,
  ForgotPasswordPage,
  LandingPage,
  LoginPage,
  RegisterPage
} from "./pages/public/PublicPages";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <ToastContainer />
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />

            {/* Protected Commuter Routes */}
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <CommuterLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CommuterDashboardPage />} />
              <Route path="plan" element={<JourneyPlannerPage />} />
              <Route path="routes" element={<RouteComparisonPage />} />
              <Route path="navigation/:journeyId" element={<ActiveNavigationPage />} />
              <Route path="saferoute" element={<SafeRoutePage />} />
              <Route path="emergency" element={<EmergencyPage />} />
              <Route path="contacts" element={<TrustedContactsPage />} />
              <Route path="wallet" element={<CarbonWalletPage />} />
              <Route path="rewards" element={<RewardsCatalogPage />} />
              <Route path="impact" element={<EnvironmentalImpactPage />} />
              <Route path="history" element={<PastJourneysPage />} />
              <Route path="profile" element={<UserProfilePage />} />
              <Route path="settings" element={<UserSettingsPage />} />
            </Route>

            {/* Protected Admin / City Operations Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<AdminOverviewPage />} />
              <Route path="map" element={<AdminMapPage />} />
              <Route path="fleet" element={<AdminFleetPage />} />
              <Route path="routes" element={<AdminRoutesPage />} />
              <Route path="weather" element={<AdminWeatherPage />} />
              <Route path="flood-zones" element={<AdminFloodZonesPage />} />
              <Route path="safety" element={<AdminSafetyPage />} />
              <Route path="incidents" element={<AdminIncidentsPage />} />
              <Route path="carbon" element={<AdminCarbonPage />} />
              <Route path="campaigns" element={<AdminCampaignsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
