/**
 * Admin — Reports page
 * Platform-wide analytics: user distribution, alert severity, activity stats.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip,
} from "recharts";
import { Users, Activity, Bell, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  users: { patients: number; doctors: number; admins: number };
  consultationsThisMonth: number;
  activeAlerts: number;
  alertsBySeverity: Partial<Record<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL", number>>;
  vitalsLoggedToday: number;
}

// ─── Colours ──────────────────────────────────────────────────────────────────

const USER_COLORS = ["#3B82F6", "#8B5CF6", "#64748B"];
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#22C55E",
};

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-xs text-slate-500">{label}</p>
          {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminReportsPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get<AdminStats>("/admin/stats").then((r) => r.data),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const totalUsers = stats.users.patients + stats.users.doctors + stats.users.admins;

  // Pie chart data
  const userDistData = [
    { name: "Patients", value: stats.users.patients },
    { name: "Doctors", value: stats.users.doctors },
    { name: "Admins", value: stats.users.admins },
  ].filter((d) => d.value > 0);

  // Bar chart data for severity
  const severityOrder: Array<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW"> = ["CRITICAL", "HIGH", "MEDIUM", "LOW"];
  const severityData = severityOrder.map((s) => ({
    name: s,
    count: stats.alertsBySeverity[s] ?? 0,
    fill: SEVERITY_COLORS[s],
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Real-time platform activity and health overview</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total users"
          value={totalUsers}
          icon={Users}
          color="bg-blue-50 text-blue-600"
          sub={`${stats.users.patients} patients · ${stats.users.doctors} doctors`}
        />
        <StatCard
          label="Consultations this month"
          value={stats.consultationsThisMonth}
          icon={Stethoscope}
          color="bg-purple-50 text-purple-600"
        />
        <StatCard
          label="Active alerts"
          value={stats.activeAlerts}
          icon={Bell}
          color="bg-amber-50 text-amber-600"
          sub="Unread across all patients"
        />
        <StatCard
          label="Vitals logged today"
          value={stats.vitalsLoggedToday}
          icon={Activity}
          color="bg-green-50 text-green-600"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User distribution pie */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">User Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {totalUsers === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-slate-400">No users yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={userDistData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {userDistData.map((_, i) => (
                      <Cell key={i} fill={USER_COLORS[i % USER_COLORS.length]} />
                    ))}
                  </Pie>
                  <PieTooltip
                    formatter={(value: number, name: string) => [
                      `${value} (${Math.round((value / totalUsers) * 100)}%)`,
                      name,
                    ]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Summary row */}
            <div className="flex justify-around pt-2 border-t border-slate-100 mt-2">
              {[
                { label: "Patients", value: stats.users.patients, color: USER_COLORS[0] },
                { label: "Doctors", value: stats.users.doctors, color: USER_COLORS[1] },
                { label: "Admins", value: stats.users.admins, color: USER_COLORS[2] },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center">
                  <p className="text-lg font-bold text-slate-900">{value}</p>
                  <div className="flex items-center gap-1 justify-center">
                    <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                    <p className="text-xs text-slate-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Alert severity bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Alerts by Severity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.activeAlerts === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-slate-400">No active alerts — all clear!</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={severityData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  barSize={40}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <BarTooltip
                    cursor={{ fill: "transparent" }}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }}
                    formatter={(value: number) => [value, "Alerts"]}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {severityData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Severity breakdown */}
            <div className="flex gap-3 flex-wrap pt-2 border-t border-slate-100 mt-2">
              {severityOrder.map((s) => {
                const count = stats.alertsBySeverity[s] ?? 0;
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ background: SEVERITY_COLORS[s] }}
                    />
                    <span className="text-xs text-slate-600">
                      {s}: <strong>{count}</strong>
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Doctor-patient link section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{stats.users.patients}</p>
              <p className="text-xs text-slate-500 mt-1">Active patients</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{stats.users.doctors}</p>
              <p className="text-xs text-slate-500 mt-1">Active doctors</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{stats.consultationsThisMonth}</p>
              <p className="text-xs text-slate-500 mt-1">Consultations this month</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-amber-600">{stats.vitalsLoggedToday}</p>
              <p className="text-xs text-slate-500 mt-1">Vitals logged today</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
