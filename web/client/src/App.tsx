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

// Doctor pages
import DoctorDashboard from "./pages/doctor/Dashboard";
import PatientDetailPage from "./pages/doctor/PatientDetail";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard";

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
              {/* Placeholder routes — expandable */}
              <Route path="/patient/medications" element={<PatientPlaceholder title="Medications" />} />
              <Route path="/patient/consultations" element={<PatientPlaceholder title="Consultations" />} />
              <Route path="/patient/reports" element={<PatientPlaceholder title="Reports" />} />
              <Route path="/patient/profile" element={<PatientPlaceholder title="Profile" />} />
              <Route path="/patient/*" element={<Navigate to="/patient/dashboard" replace />} />
            </Route>
          </Route>

          {/* Doctor portal — role-guarded */}
          <Route element={<ProtectedRoute allowedRoles={["DOCTOR"]} />}>
            <Route element={<PortalLayout />}>
              <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
              <Route path="/doctor/patients/:id" element={<PatientDetailPage />} />
              <Route path="/doctor/patients" element={<DoctorPlaceholder title="All Patients" />} />
              <Route path="/doctor/alerts" element={<DoctorPlaceholder title="Alerts Panel" />} />
              <Route path="/doctor/schedule" element={<DoctorPlaceholder title="Schedule" />} />
              <Route path="/doctor/*" element={<Navigate to="/doctor/dashboard" replace />} />
            </Route>
          </Route>

          {/* Admin portal — role-guarded */}
          <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route element={<PortalLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminPlaceholder title="User Management" />} />
              <Route path="/admin/reports" element={<AdminPlaceholder title="Reports" />} />
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

// ─── Placeholder components (to be replaced page-by-page) ────────────────────

function PatientPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500 text-sm">This page is being built.</p>
      </div>
    </div>
  );
}

function DoctorPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500 text-sm">This page is being built.</p>
      </div>
    </div>
  );
}

function AdminPlaceholder({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-500 text-sm">This page is being built.</p>
      </div>
    </div>
  );
}
