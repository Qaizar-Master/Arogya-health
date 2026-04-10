/**
 * Persistent left sidebar — shared across patient and doctor portals.
 * Collapses to icon-only on small screens with a toggle button.
 */

import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  LogOut,
  Pill,
  Settings,
  Stethoscope,
  Users,
  BarChart3,
} from "lucide-react";
import { cn, fullName } from "../../lib/utils";
import { useAuthStore } from "../../stores/auth.store";
import { Badge } from "../ui/badge";
import { useQuery } from "@tanstack/react-query";
import api from "../../lib/api";

// ─── Nav item definitions by role ────────────────────────────────────────────

const PATIENT_NAV = [
  { label: "Dashboard", icon: Home, to: "/patient/dashboard" },
  { label: "Vitals", icon: Activity, to: "/patient/vitals" },
  { label: "Medications", icon: Pill, to: "/patient/medications" },
  { label: "Consultations", icon: Calendar, to: "/patient/consultations" },
  { label: "Reports", icon: FileText, to: "/patient/reports" },
  { label: "Profile", icon: Settings, to: "/patient/profile" },
];

const DOCTOR_NAV = [
  { label: "Dashboard", icon: Home, to: "/doctor/dashboard" },
  { label: "Patients", icon: Users, to: "/doctor/patients" },
  { label: "Alerts", icon: Bell, to: "/doctor/alerts" },
  { label: "Schedule", icon: Calendar, to: "/doctor/schedule" },
];

const ADMIN_NAV = [
  { label: "Dashboard", icon: Home, to: "/admin/dashboard" },
  { label: "Users", icon: Users, to: "/admin/users" },
  { label: "Reports", icon: BarChart3, to: "/admin/reports" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  // Fetch unread alert count
  const { data: alertData } = useQuery({
    queryKey: ["alerts-count"],
    queryFn: () => api.get("/alerts/me?unread=true&limit=1").then((r) => r.data),
    refetchInterval: 30_000, // poll every 30s
    enabled: !!user,
  });
  const unreadCount: number = alertData?.unreadCount ?? 0;

  const navItems =
    user?.role === "DOCTOR"
      ? DOCTOR_NAV
      : user?.role === "ADMIN"
      ? ADMIN_NAV
      : PATIENT_NAV;

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      logout();
      navigate("/login");
    }
  };

  return (
    <aside
      className={cn(
        "relative flex flex-col h-screen bg-white border-r border-slate-200 transition-all duration-200 ease-in-out",
        collapsed ? "w-16" : "w-60"
      )}
      aria-label="Main navigation"
    >
      {/* Logo + collapse toggle */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-100">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 tracking-tight">Arogya</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 mx-auto rounded-lg bg-brand-500 flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
        )}
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-2 p-1 rounded hover:bg-slate-100 text-slate-500"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* User info */}
      <div
        className={cn(
          "px-4 py-3 border-b border-slate-100",
          collapsed && "flex justify-center"
        )}
      >
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-semibold text-brand-700">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {user ? fullName({ firstName: user.firstName ?? "", lastName: user.lastName ?? "" }) : ""}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Nav links */}
      <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const isAlerts = item.label === "Alerts";
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                  collapsed && "justify-center px-2"
                )
              }
              title={collapsed ? item.label : undefined}
              aria-label={item.label}
            >
              <div className="relative flex-shrink-0">
                <item.icon className="w-5 h-5" />
                {isAlerts && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </div>
              {!collapsed && (
                <span>
                  {item.label}
                  {isAlerts && unreadCount > 0 && (
                    <Badge variant="danger" className="ml-2 text-[10px] px-1.5 py-0">
                      {unreadCount}
                    </Badge>
                  )}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors",
            collapsed && "justify-center px-2"
          )}
          aria-label="Log out"
          title={collapsed ? "Log out" : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && "Log out"}
        </button>
      </div>
    </aside>
  );
}
