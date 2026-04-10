/**
 * Patient Dashboard — health score card, recent vitals sparklines,
 * medication adherence ring, upcoming consultations, unread alerts.
 */

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Activity, Bell, Calendar, Pill, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, Tooltip as ReTooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import { useAuthStore } from "../../stores/auth.store";
import api from "../../lib/api";
import {
  VitalLog, Medication, Consultation, Alert,
} from "../../types";
import {
  VITAL_RANGES, SEVERITY_BADGE, adherenceColor, isVitalOutOfRange,
} from "../../lib/utils";

// ─── Sparkline chart for a single vital ───────────────────────────────────────

function VitalSparkline({ data, field, color }: {
  data: VitalLog[];
  field: keyof VitalLog;
  color: string;
}) {
  const points = data
    .filter((v) => v[field] !== null)
    .slice(-14)
    .map((v) => ({ value: v[field] as number, date: v.recordedAt }));

  if (points.length === 0) return <p className="text-xs text-slate-400">No data</p>;

  const latest = points[points.length - 1]?.value;
  const prev = points[points.length - 2]?.value;
  const trend = prev ? (latest > prev ? "up" : latest < prev ? "down" : "flat") : "flat";
  const range = VITAL_RANGES[field as string];
  const outOfRange = range ? isVitalOutOfRange(field as string, latest) : false;

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className={`text-xl font-bold ${outOfRange ? "text-red-600" : "text-slate-900"}`}>
          {latest}
        </span>
        <span className="text-xs text-slate-500">{range?.unit}</span>
        {trend === "up" && <TrendingUp className="w-3 h-3 text-slate-400" />}
        {trend === "down" && <TrendingDown className="w-3 h-3 text-slate-400" />}
        {trend === "flat" && <Minus className="w-3 h-3 text-slate-400" />}
      </div>
      <ResponsiveContainer width="100%" height={40}>
        <LineChart data={points}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={outOfRange ? "#E24B4A" : color}
            dot={false}
            strokeWidth={2}
          />
          <ReTooltip
            content={({ active, payload }) =>
              active && payload?.[0] ? (
                <div className="bg-white border border-slate-200 rounded px-2 py-1 text-xs shadow">
                  {payload[0].value} {range?.unit}
                </div>
              ) : null
            }
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Adherence ring ───────────────────────────────────────────────────────────

function AdherenceRing({ pct }: { pct: number }) {
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex items-center gap-4">
      <svg width="72" height="72" viewBox="0 0 72 72" aria-label={`Adherence: ${pct}%`}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke={pct >= 90 ? "#3B6D11" : pct >= 70 ? "#BA7517" : "#E24B4A"}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 36 36)"
        />
        <text x="36" y="41" textAnchor="middle" className="text-sm font-bold" fill="#1e293b" fontSize="14">
          {pct}%
        </text>
      </svg>
      <div>
        <p className="text-sm font-medium text-slate-700">30-day adherence</p>
        <p className={`text-sm ${adherenceColor(pct)}`}>
          {pct >= 90 ? "Excellent" : pct >= 70 ? "Needs improvement" : "Poor — please check in"}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const { user } = useAuthStore();

  const { data: vitalsData, isLoading: vitalsLoading } = useQuery({
    queryKey: ["vitals-me", { limit: 30 }],
    queryFn: () =>
      api.get<{ data: VitalLog[] }>("/vitals/me?limit=30").then((r) => r.data),
  });

  const { data: meds, isLoading: medsLoading } = useQuery({
    queryKey: ["medications-me"],
    queryFn: () => api.get<Medication[]>("/medications/me?active=true").then((r) => r.data),
  });

  const { data: consultations, isLoading: consultsLoading } = useQuery({
    queryKey: ["consultations-me"],
    queryFn: () => api.get<Consultation[]>("/consultations/me").then((r) => r.data),
  });

  const { data: alertData, isLoading: alertsLoading } = useQuery({
    queryKey: ["alerts-me"],
    queryFn: () =>
      api.get<{ alerts: Alert[]; unreadCount: number }>("/alerts/me?unread=true&limit=5").then((r) => r.data),
  });

  const vitals = vitalsData?.data ?? [];
  const upcomingConsults = (consultations ?? []).filter(
    (c) => c.status === "SCHEDULED" && new Date(c.scheduledAt) >= new Date()
  ).slice(0, 3);

  // Compute rough 30-day adherence from all meds
  const adherencePct = (() => {
    if (!meds?.length) return 100;
    const allLogs = meds.flatMap((m) => m.adherenceLogs ?? []);
    const done = allLogs.filter((l) => l.status !== "PENDING");
    const taken = done.filter((l) => l.status === "TAKEN");
    return done.length > 0 ? Math.round((taken.length / done.length) * 100) : 100;
  })();

  // Conditions come from profile query — abbreviated here, expanded in Profile page

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good {getGreeting()}, {user?.firstName}
        </h1>
        <p className="text-slate-500 text-sm mt-1">Here's your health summary for today</p>
      </div>

      {/* Quick stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <QuickStat
          label="Active Medications"
          value={medsLoading ? "…" : String(meds?.length ?? 0)}
          icon={<Pill className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-50"
        />
        <QuickStat
          label="Unread Alerts"
          value={alertsLoading ? "…" : String(alertData?.unreadCount ?? 0)}
          icon={<Bell className="w-5 h-5 text-amber-600" />}
          bg="bg-amber-50"
          urgent={(alertData?.unreadCount ?? 0) > 0}
        />
        <QuickStat
          label="Vitals Logged (30d)"
          value={vitalsLoading ? "…" : String(vitals.length)}
          icon={<Activity className="w-5 h-5 text-brand-600" />}
          bg="bg-brand-50"
        />
        <QuickStat
          label="Next Consultation"
          value={
            consultsLoading
              ? "…"
              : upcomingConsults[0]
              ? format(new Date(upcomingConsults[0].scheduledAt), "dd MMM")
              : "None"
          }
          icon={<Calendar className="w-5 h-5 text-purple-600" />}
          bg="bg-purple-50"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Vitals sparklines */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-600" />
                Recent Vitals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {vitalsLoading ? (
                <div className="grid grid-cols-2 gap-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}
                </div>
              ) : vitals.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No vitals logged yet</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Go to Vitals to log your first reading
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  {(["bloodGlucose", "systolicBP", "heartRate", "weight"] as const).map((field) => {
                    const range = VITAL_RANGES[field];
                    const hasData = vitals.some((v) => v[field] !== null);
                    if (!hasData) return null;
                    return (
                      <div key={field}>
                        <p className="text-xs font-medium text-slate-500 mb-1">{range?.label}</p>
                        <VitalSparkline data={vitals} field={field} color="#0F6E56" />
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Adherence ring */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-blue-600" />
                Medication Adherence
              </CardTitle>
            </CardHeader>
            <CardContent>
              {medsLoading ? (
                <Skeleton className="h-20" />
              ) : (
                <AdherenceRing pct={adherencePct} />
              )}
            </CardContent>
          </Card>

          {/* Unread alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <Skeleton className="h-24" />
              ) : !alertData?.alerts?.length ? (
                <p className="text-sm text-slate-500 py-2">No unread alerts</p>
              ) : (
                <div className="space-y-3">
                  {alertData.alerts.slice(0, 4).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-2">
                      <Badge
                        className={SEVERITY_BADGE[alert.severity]}
                        variant="outline"
                      >
                        {alert.severity}
                      </Badge>
                      <p className="text-xs text-slate-700 leading-snug">{alert.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming consultations */}
      {upcomingConsults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              Upcoming Consultations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingConsults.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {c.doctor
                        ? `Dr. ${c.doctor.firstName} ${c.doctor.lastName}`
                        : "Doctor"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {c.chiefComplaint ?? "General consultation"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-slate-900">
                      {format(new Date(c.scheduledAt), "dd MMM")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {format(new Date(c.scheduledAt), "h:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuickStat({
  label,
  value,
  icon,
  bg,
  urgent = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  bg: string;
  urgent?: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
            {icon}
          </div>
          <div>
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-xl font-bold ${urgent ? "text-red-600" : "text-slate-900"}`}>
              {value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
