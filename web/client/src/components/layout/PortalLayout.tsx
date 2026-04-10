/**
 * Shell layout for authenticated portals (patient, doctor, admin).
 * Contains: persistent sidebar + main scrollable content area with sticky header.
 */

import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { SyncStatusIndicator } from "../SyncStatusIndicator";
import { useAuthStore } from "../../stores/auth.store";

function getBreadcrumb(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  // Capitalise each segment, replace hyphens with spaces
  return segments
    .map((s) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
    .join(" › ");
}

export function PortalLayout() {
  const { user } = useAuthStore();
  const { pathname } = useLocation();
  const breadcrumb = getBreadcrumb(pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Sticky page header */}
        <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between">
          <nav aria-label="Breadcrumb">
            <p className="text-sm text-slate-500">{breadcrumb}</p>
          </nav>

          <div className="flex items-center gap-4">
            {/* Offline sync indicator — only shown to patients */}
            {user?.role === "PATIENT" && <SyncStatusIndicator />}

            <div className="text-right">
              <p className="text-sm font-medium text-slate-700">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase()}</p>
            </div>
          </div>
        </header>

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
