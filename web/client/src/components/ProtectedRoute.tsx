/**
 * Route guard — redirects unauthenticated users to /login.
 * Optionally enforces a specific role.
 */

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../stores/auth.store";
import { Role } from "../types";

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // Redirect to the user's own portal home
    const roleHome: Record<Role, string> = {
      PATIENT: "/patient/dashboard",
      DOCTOR: "/doctor/dashboard",
      ADMIN: "/admin/dashboard",
    };
    return <Navigate to={roleHome[user.role]} replace />;
  }

  return <Outlet />;
}
