/**
 * Patient — Reports page
 * Condition-aware vitals trends, medication adherence summary, and alert history.
 */

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceArea, BarChart, Bar, Cell,
} from "recharts";
import { Activity, Bell, Pill, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import { VitalLog, Medication, Alert } from "../../types";
import {
  VITAL_RANGES, CONDITION_LABELS, SEVERITY_BADGE, adherenceColor, isVitalOutOfRange,
} from "../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MyProfile {
  profile: {
    conditions: Array<{ conditionType: string }>;
  } | null;
}

// ─── Vital trend mini-chart ───────────────────────────────────────────────────

function VitalTrendCard({
  vitals, field, days,
}: {
  vitals: VitalLog[];
  field: string;
  days: number;
}) {
  const range = VITAL_RANGES[field];
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const data = vitals
    .filter((v) => {
      const val = v[field as keyof VitalLog];
      return val !== null && val !== undefined && new Date(v.recordedAt) >= cutoff;
    })
    .map((v) => ({
      date: format(new Date(v.recordedAt), "dd/MM"),
      value: v[field as keyof VitalLog] as number,
    }))
    .reverse();

  if (data.length === 0) return null;

  const latest = data[data.length - 1]?.value;
  const outOfRange = range ? isVitalOutOfRange(field, latest) : false;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-700">
          {range?.label ?? field}
          <span className="ml-2 text-xs font-normal text-slate-400">
            {range && `Normal: ${range.min}–${range.max} ${range.unit}`}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-2xl font-bold ${outOfRange ? "text-red-600" : "text-slate-900"}`}>
            {latest}
          </span>
          <span className="text-sm text-slate-400">{range?.unit}</span>
          {outOfRange && (
            <Badge variant="danger" className="text-[10px]">Out of range</Badge>
          )}
        </div>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} />
            <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
            {range && (
              <ReferenceArea y1={range.min} y2={range.max} fill="#0F6E56" fillOpacity={0.07} />
            )}
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="bg-white border rounded px-2 py-1 text-xs shadow">
                    {payload[0].value} {range?.unit}
                  </div>
                ) : null
              }
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={outOfRange ? "#E24B4A" : "#0F6E56"}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Adherence bar chart ──────────────────────────────────────────────────────

function AdherenceChart({ medications }: { medications: Medication[] }) {
  const active = medications.filter((m) => m.active);
  if (active.length === 0) return null;

  const data = active.map((m) => {
    const logs = m.adherenceLogs ?? [];
    const done = logs.filter((l) => l.status !== "PENDING");
    const taken = done.filter((l) => l.status === "TAKEN");
    const pct = done.length > 0 ? Math.round((taken.length / done.length) * 100) : 0;
    return { name: m.name, pct };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Pill className="w-4 h-4 text-blue-600" />
          Medication Adherence (last 30 days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 40)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <div className="bg-white border rounded px-2 py-1 text-xs shadow">
                    {payload[0].payload.name}: {payload[0].value}%
                  </div>
                ) : null
              }
            />
            <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
              {data.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.pct >= 90 ? "#3B6D11" : d.pct >= 70 ? "#BA7517" : "#E24B4A"}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const CONDITION_VITALS: Record<string, string[]> = {
  DIABETES_T1: ["bloodGlucose", "hba1c"],
  DIABETES_T2: ["bloodGlucose", "hba1c"],
  HYPERTENSION: ["systolicBP", "diastolicBP"],
  CKD: ["creatinine", "egfr"],
  HEART_DISEASE: ["cholesterol", "heartRate"],
  COPD: ["spo2"],
  ASTHMA: ["spo2"],
};

export default function ReportsPage() {
  const { data: vitalsData, isLoading: vitalsLoading } = useQuery({
    queryKey: ["vitals-me-reports"],
    queryFn: () => api.get<{ data: VitalLog[] }>("/vitals/me?limit=200").then((r) => r.data),
  });

  const { data: meds, isLoading: medsLoading } = useQuery({
    queryKey: ["medications-me-reports"],
    queryFn: () => api.get<Medication[]>("/medications/me").then((r) => r.data),
  });

  const { data: alertData } = useQuery({
    queryKey: ["alerts-me-reports"],
    queryFn: () =>
      api.get<{ alerts: Alert[]; unreadCount: number }>("/alerts/me?limit=50").then((r) => r.data),
  });

  const { data: profileData } = useQuery({
    queryKey: ["profile-me-reports"],
    queryFn: () => api.get<MyProfile>("/profile/me").then((r) => r.data),
  });

  const vitals = vitalsData?.data ?? [];
  const medications = meds ?? [];
  const alerts = alertData?.alerts ?? [];
  const conditions = profileData?.profile?.conditions ?? [];

  // Determine which vitals fields to show based on conditions
  const conditionTypes = conditions.map((c) => c.conditionType);
  const fieldsToShow = new Set<string>(["heartRate", "weight"]);
  conditionTypes.forEach((ct) => {
    (CONDITION_VITALS[ct] ?? []).forEach((f) => fieldsToShow.add(f));
  });
  // Also add any field that has data
  vitals.forEach((v) => {
    Object.keys(v).forEach((k) => {
      if (VITAL_RANGES[k] && v[k as keyof VitalLog] !== null) {
        fieldsToShow.add(k);
      }
    });
  });

  // Overall adherence
  const allLogs = medications.flatMap((m) => m.adherenceLogs ?? []);
  const doneLogs = allLogs.filter((l) => l.status !== "PENDING");
  const takenLogs = doneLogs.filter((l) => l.status === "TAKEN");
  const overallAdherence = doneLogs.length > 0
    ? Math.round((takenLogs.length / doneLogs.length) * 100)
    : null;

  const isLoading = vitalsLoading || medsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Health Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Your longitudinal health summary and trends</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Vitals Logged",
            value: vitalsLoading ? "…" : String(vitals.length),
            icon: <Activity className="w-5 h-5 text-brand-600" />,
            bg: "bg-brand-50",
          },
          {
            label: "Active Medications",
            value: medsLoading ? "…" : String(medications.filter((m) => m.active).length),
            icon: <Pill className="w-5 h-5 text-blue-600" />,
            bg: "bg-blue-50",
          },
          {
            label: "30-day Adherence",
            value:
              overallAdherence !== null ? `${overallAdherence}%` : "N/A",
            icon: <TrendingUp className="w-5 h-5 text-green-600" />,
            bg: "bg-green-50",
            color: overallAdherence !== null ? adherenceColor(overallAdherence) : "text-slate-900",
          },
          {
            label: "Total Alerts",
            value: String(alerts.length),
            icon: <Bell className="w-5 h-5 text-amber-600" />,
            bg: "bg-amber-50",
          },
        ].map(({ label, value, icon, bg, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                {icon}
              </div>
              <div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className={`text-xl font-bold ${color ?? "text-slate-900"}`}>{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conditions summary */}
      {conditions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {conditions.map((c, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {CONDITION_LABELS[c.conditionType as keyof typeof CONDITION_LABELS] ?? c.conditionType}
            </Badge>
          ))}
        </div>
      )}

      {/* Vitals charts */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : vitals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No vitals data yet. Start logging from the Vitals page.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...fieldsToShow]
            .filter((f) => vitals.some((v) => v[f as keyof VitalLog] !== null))
            .map((field) => (
              <VitalTrendCard key={field} vitals={vitals} field={field} days={30} />
            ))}
        </div>
      )}

      {/* Adherence chart */}
      {!medsLoading && medications.length > 0 && (
        <AdherenceChart medications={medications} />
      )}

      {/* Recent alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Bell className="w-4 h-4 text-amber-600" />
              Alert History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 10).map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                  <Badge className={`${SEVERITY_BADGE[alert.severity]} flex-shrink-0 mt-0.5`}>
                    {alert.severity}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700">{alert.message}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {format(new Date(alert.createdAt), "dd MMM yyyy, h:mm a")}
                    </p>
                  </div>
                  {alert.isRead && (
                    <Badge variant="secondary" className="text-[10px] flex-shrink-0">Read</Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
