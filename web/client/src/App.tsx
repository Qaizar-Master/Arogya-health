/**
 * Arogya — React app root.
 * Sets up React Router with role-based nested routes.
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "sonner";

import { ProtectedRoute } from "./components/ProtectedRoute";
import { PortalLayout } from "./components/layout/PortalLayout";

// Pages
import LandingPage from "./pages/Landing";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";

// Patient pages
import PatientDashboard from "./pages/patient/Dashboard";
import VitalsPage from "./pages/patient/Vitals";
import MedicationsPage from "./pages/patient/Medications";
import ConsultationsPage from "./pages/patient/Consultations";
import PatientReportsPage from "./pages/patient/Reports";
import ProfilePage from "./pages/patient/Profile";

// Doctor pages
import DoctorDashboard from "./pages/doctor/Dashboard";
import PatientDetailPage from "./pages/doctor/PatientDetail";
import DoctorPatientsPage from "./pages/doctor/Patients";
import DoctorAlertsPage from "./pages/doctor/Alerts";
import SchedulePage from "./pages/doctor/Schedule";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsersPage from "./pages/admin/Users";
import AdminReportsPage from "./pages/admin/Reports";

// ─── React Query config ───────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,           // 30s before refetch
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Patient portal — role-guarded */}
          <Route element={<ProtectedRoute allowedRoles={["PATIENT"]} />}>
            <Route element={<PortalLayout />}>
              <Route path="/patient/dashboard" element={<PatientDashboard />} />
              <Route path="/patient/vitals" element={<VitalsPage />} />
              <Route path="/patient/medications" element={<MedicationsPage />} />
              <Route path="/patient/consultations" element={<ConsultationsPage />} />
              <Route path="/patient/reports" element={<PatientReportsPage />} />
              <Route path="/patient/profile" element={<ProfilePage />} />
              <Route path="/patient/*" element={<Navigate to="/patient/dashboard" replace />} />
            </Route>
          </Route>

          {/* Doctor portal — role-guarded */}
          <Route element={<ProtectedRoute allowedRoles={["DOCTOR"]} />}>
            <Route element={<PortalLayout />}>
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/patients/:id" element={<PatientDetailPage />} />
              <Route path="/doctor/patients" element={<DoctorPatientsPage />} />
              <Route path="/doctor/alerts" element={<DoctorAlertsPage />} />
              <Route path="/doctor/schedule" element={<SchedulePage />} />
              <Route path="/doctor/*" element={<Navigate to="/doctor/dashboard" replace />} />
            </Route>
          </Route>

          {/* Admin portal — role-guarded */}
          <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route element={<PortalLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
              <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        richColors
        toastOptions={{
          duration: 4000,
          style: { fontFamily: "Inter, sans-serif", fontSize: "14px" },
        }}
      />

      {/* React Query devtools (dev only) */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}

