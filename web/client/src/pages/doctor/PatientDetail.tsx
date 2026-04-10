/**
 * Doctor — Patient Detail page (/doctor/patients/:id)
 * Full longitudinal view: conditions, vitals charts, medications, consultations.
 * AI panel sidebar for anomaly analysis.
 */

import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Activity, AlertTriangle, Brain, RefreshCw, Stethoscope,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceArea,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";
import api from "../../lib/api";
import { Profile, VitalLog, VitalsAnalysis, AlertSeverity } from "../../types";
import {
  CONDITION_LABELS, VITAL_RANGES, fullName, formatDate, isVitalOutOfRange,
  SEVERITY_BADGE, computeRiskTier, RISK_TIER_STYLES,
} from "../../lib/utils";

// ─── AI Panel sidebar ────────────────────────────────────────────────────────

function AIPanelSidebar({
  profile,
  vitals,
}: {
  profile: Profile;
  vitals: VitalLog[];
}) {
  const [analysis, setAnalysis] = useState<VitalsAnalysis | null>(null);

  const analyzeMutation = useMutation({
    mutationFn: () =>
      api.post<{ analysis: VitalsAnalysis }>("/ai/analyze-vitals", {
        conditions: profile.conditions?.map((c) => c.conditionType) ?? [],
        vitals: vitals.slice(0, 30),
      }).then((r) => r.data.analysis),
    onSuccess: (data) => setAnalysis(data),
    onError: () => toast.error("AI analysis failed. Check API key configuration."),
  });

  const urgencyColor = {
    low: "text-green-600 bg-green-50",
    medium: "text-amber-600 bg-amber-50",
    high: "text-orange-600 bg-orange-50",
    critical: "text-red-600 bg-red-50",
  };

  return (
    <Card className="sticky top-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Brain className="w-4 h-4 text-brand-600" />
          AI Clinical Analysis
        </CardTitle>
        <CardDescription className="text-xs">
          Powered by Claude — review before acting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => analyzeMutation.mutate()}
          loading={analyzeMutation.isPending}
          disabled={vitals.length === 0}
        >
          {analyzeMutation.isPending ? (
            <>Analysing…</>
          ) : (
            <>
              <RefreshCw className="w-3 h-3 mr-2" />
              Analyse last 30 days
            </>
          )}
        </Button>

        {vitals.length === 0 && (
          <p className="text-xs text-slate-400 text-center">No vitals to analyse</p>
        )}

        {analysis && (
          <div className="space-y-3">
            {/* Urgency level */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${urgencyColor[analysis.urgency_level]}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Urgency: {analysis.urgency_level.toUpperCase()}
            </div>

            {/* Anomalies */}
            {analysis.anomalies.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Anomalies ({analysis.anomalies.length})
                </p>
                <div className="space-y-2">
                  {analysis.anomalies.map((a, i) => (
                    <div key={i} className="p-2 bg-red-50 rounded-lg border border-red-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-red-700">
                          {VITAL_RANGES[a.field]?.label ?? a.field}
                        </span>
                        <span className="text-xs text-red-600 font-bold">
                          {a.value} {a.unit}
                        </span>
                      </div>
                      <p className="text-xs text-red-600">{a.note}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Normal: {a.normalRange}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trend summary */}
            <div>
              <p className="text-xs font-semibold text-slate-700 mb-1">Trend Summary</p>
              <p className="text-xs text-slate-600 leading-relaxed">{analysis.trend_summary}</p>
            </div>

            {/* Recommended follow-up */}
            <div className="p-2 bg-brand-50 rounded-lg border border-brand-100">
              <p className="text-xs font-semibold text-brand-700 mb-1">Recommended Action</p>
              <p className="text-xs text-brand-700">{analysis.recommended_followup}</p>
            </div>

            <p className="text-[10px] text-slate-400">
              AI draft — clinical judgement required before acting
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["patient-profile", id],
    queryFn: () => api.get<Profile>(`/profile/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  const { data: vitalsData, isLoading: vitalsLoading } = useQuery({
    queryKey: ["patient-vitals", id],
    queryFn: () =>
      api.get<{ data: VitalLog[] }>(`/vitals/${id}?limit=90`).then((r) => r.data),
    enabled: !!id,
  });

  // These queries are placeholders for doctor-accessible patient data endpoints
  // to be implemented as the API expands
  useQuery({
    queryKey: ["patient-meds", id],
    queryFn: () => Promise.resolve([]),
    enabled: false,
  });

  useQuery({
    queryKey: ["patient-consults", id],
    queryFn: () => Promise.resolve([]),
    enabled: false,
  });

  const vitals = vitalsData?.data ?? [];

  if (profileLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  if (!profile) return <p className="text-slate-500">Patient not found.</p>;

  const tier = computeRiskTier(profile.alerts ?? []);
  const tierStyle = RISK_TIER_STYLES[tier];

  // Condition-aware vitals to show
  const conditionTypes = profile.conditions?.map((c) => c.conditionType) ?? [];
  const chartFields: Array<{ field: string; label: string }> = [
    ...(conditionTypes.some((c) => c.startsWith("DIABETES"))
      ? [{ field: "bloodGlucose", label: "Blood Glucose" }, { field: "hba1c", label: "HbA1c" }]
      : []),
    ...(conditionTypes.includes("HYPERTENSION")
      ? [{ field: "systolicBP", label: "Systolic BP" }, { field: "diastolicBP", label: "Diastolic BP" }]
      : []),
    ...(conditionTypes.includes("CKD")
      ? [{ field: "creatinine", label: "Creatinine" }, { field: "egfr", label: "eGFR" }]
      : []),
    ...(conditionTypes.includes("HEART_DISEASE")
      ? [{ field: "cholesterol", label: "Cholesterol" }]
      : []),
    { field: "heartRate", label: "Heart Rate" },
    { field: "weight", label: "Weight" },
  ];

  return (
    <div className="space-y-6">
      {/* Patient header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center">
            <span className="text-xl font-bold text-brand-700">
              {profile.firstName[0]}{profile.lastName[0]}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{fullName(profile)}</h1>
              <Badge className={tierStyle.badge}>{tierStyle.label}</Badge>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {profile.conditions?.map((c) => (
                <Badge key={c.id} variant="outline" className="text-[10px]">
                  {CONDITION_LABELS[c.conditionType]}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              ABHA: {profile.abhaId ?? "Not linked"} ·{" "}
              {profile.dateOfBirth
                ? `${new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear()} years`
                : ""}{" "}
              {profile.gender}
            </p>
          </div>
        </div>

        <Button
          onClick={() => navigate(`/doctor/patients/${id}/consult/new`)}
          className="flex items-center gap-2"
        >
          <Stethoscope className="w-4 h-4" />
          Start Consultation
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main content — 3 cols */}
        <div className="lg:col-span-3 space-y-6">
          {/* Vitals charts */}
          <div>
            <h2 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-600" />
              Vitals Timeline
            </h2>
            {vitalsLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48" />)}
              </div>
            ) : vitals.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-slate-400 text-sm">
                  No vitals on record for this patient
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chartFields
                  .filter((f) => vitals.some((v) => v[f.field as keyof VitalLog] !== null))
                  .slice(0, 6)
                  .map(({ field, label }) => {
                    const range = VITAL_RANGES[field];
                    const chartData = vitals
                      .filter((v) => v[field as keyof VitalLog] !== null)
                      .slice(0, 30)
                      .map((v) => ({
                        date: format(new Date(v.recordedAt), "dd/MM"),
                        value: v[field as keyof VitalLog] as number,
                      }))
                      .reverse();

                    return (
                      <Card key={field}>
                        <CardHeader className="pb-1">
                          <CardTitle className="text-xs text-slate-600">
                            {label}
                            {range && (
                              <span className="ml-2 font-normal text-slate-400">
                                Normal {range.min}–{range.max} {range.unit}
                              </span>
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={130}>
                            <LineChart data={chartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="date" tick={{ fontSize: 9 }} tickLine={false} />
                              <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                              {range && (
                                <ReferenceArea
                                  y1={range.min}
                                  y2={range.max}
                                  fill="#0F6E56"
                                  fillOpacity={0.07}
                                />
                              )}
                              <Tooltip
                                content={({ active, payload }) =>
                                  active && payload?.[0] ? (
                                    <div className="bg-white border rounded px-2 py-1 text-xs shadow">
                                      {payload[0].value} {range?.unit}
                                      {isVitalOutOfRange(field, payload[0].value as number) && (
                                        <p className="text-red-600">Out of range</p>
                                      )}
                                    </div>
                                  ) : null
                                }
                              />
                              <Line
                                type="monotone"
                                dataKey="value"
                                stroke="#0F6E56"
                                strokeWidth={2}
                                dot={(props: any) => {
                                  const out = isVitalOutOfRange(field, props.value);
                                  return (
                                    <circle
                                      key={props.index}
                                      cx={props.cx}
                                      cy={props.cy}
                                      r={3}
                                      fill={out ? "#E24B4A" : "#0F6E56"}
                                      stroke="white"
                                      strokeWidth={1}
                                    />
                                  );
                                }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Unread alerts for this patient */}
          {(profile.alerts?.length ?? 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {profile.alerts?.filter((a) => !a.isRead).slice(0, 5).map((alert) => (
                    <div key={alert.id} className="flex items-start gap-3 p-2 bg-slate-50 rounded-lg">
                      <Badge className={SEVERITY_BADGE[alert.severity as AlertSeverity]}>
                        {alert.severity}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-700">{alert.message}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {formatDate(alert.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Sidebar — 1 col */}
        <div>
          <AIPanelSidebar profile={profile} vitals={vitals} />
        </div>
      </div>
    </div>
  );
}
