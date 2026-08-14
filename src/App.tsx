import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { AdminShell } from "@/components/layout/AdminShell";
import { AppShell } from "@/components/layout/AppShell";
import { PageSkeleton } from "@/components/ui/States";

// Routes are code-split so the initial bundle stays small (Section XVI budget).
const ExplorePage = lazy(() => import("@/pages/ExplorePage"));
const PropertyPage = lazy(() => import("@/pages/PropertyPage"));
const AgentPage = lazy(() => import("@/pages/AgentPage"));
const ReviewPage = lazy(() => import("@/pages/ReviewPage"));
const ComparePage = lazy(() => import("@/pages/ComparePage"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const AlertsPage = lazy(() => import("@/pages/AlertsPage"));
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AgentsPage = lazy(() => import("@/pages/AgentsPage"));
const FeeCheckPage = lazy(() => import("@/pages/FeeCheckPage"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));

export default function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<ExplorePage />} />
          <Route path="property/:propertyId" element={<PropertyPage />} />
          <Route path="agents" element={<AgentsPage />} />
          <Route path="fees" element={<FeeCheckPage />} />
          <Route path="agent/:slug" element={<AgentPage />} />
          <Route path="review" element={<ReviewPage />} />
          <Route path="compare" element={<ComparePage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="legal/:doc" element={<LegalPage />} />
        </Route>
        {/* Moderation lives in its own chrome — no tenant bottom nav. */}
        <Route element={<AdminShell />}>
          <Route path="admin" element={<AdminPage />} />
        </Route>
        <Route path="*" element={<AppShell />}>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
