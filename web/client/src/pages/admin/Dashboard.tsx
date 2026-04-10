/**
 * Admin dashboard — platform statistics overview.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Stethoscope, Calendar, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Badge } from "../../components/ui/badge";
import api from "../../lib/api";

interface AdminStats {
  users: { patients: number; doctors: number; admins: number };
  consultationsThisMonth: number;
  activeAlerts: number;
  alertsBySeverity: Record<string, number>;
  vitalsLoggedToday: number;
}

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const StatCard = ({
    label, value, icon, sub
  }: { label: string; value: string | number; icon: React.ReactNode; sub?: string }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            {isLoading ? (
              <Skeleton className="h-8 w-16 mt-1" />
            ) : (
              <p className="text-3xl font-bold text-slate-900 mt-1">{value}</p>
            )}
            {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Platform health and statistics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Patients"
          value={stats?.users.patients ?? "—"}
          icon={<Users className="w-6 h-6 text-brand-600" />}
          sub="Active accounts"
        />
        <StatCard
          label="Active Doctors"
          value={stats?.users.doctors ?? "—"}
          icon={<Stethoscope className="w-6 h-6 text-brand-600" />}
          sub="Verified clinicians"
        />
        <StatCard
          label="Consultations (month)"
          value={stats?.consultationsThisMonth ?? "—"}
          icon={<Calendar className="w-6 h-6 text-purple-600" />}
        />
        <StatCard
          label="Active Alerts"
          value={stats?.activeAlerts ?? "—"}
          icon={<Bell className="w-6 h-6 text-amber-600" />}
          sub="Unresolved"
        />
      </div>

      {/* Alerts by severity */}
      <Card>
        <CardHeader>
          <CardTitle>Alerts by Severity</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-20" />
          ) : (
            <div className="flex gap-4">
              {Object.entries(stats?.alertsBySeverity ?? {}).map(([severity, count]) => (
                <div key={severity} className="flex items-center gap-2">
                  <Badge
                    variant={
                      severity === "CRITICAL" || severity === "HIGH"
                        ? "danger"
                        : severity === "MEDIUM"
                        ? "warning"
                        : "secondary"
                    }
                  >
                    {severity}
                  </Badge>
                  <span className="font-bold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Vitals logged today:{" "}
            <span className="font-bold text-slate-900">
              {isLoading ? "…" : stats?.vitalsLoggedToday ?? 0}
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
